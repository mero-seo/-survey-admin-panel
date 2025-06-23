"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  BarChart3,
  Star,
  ThumbsUp,
  ThumbsDown,
  PowerIcon,
  PowerOffIcon,
  SettingsIcon,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { StatCard } from "@/components/StatCard";
import { DynamicTable, ColumnDef } from "@/components/DynamicTable";
import { StatCardSkeleton } from "@/components/StatCardSkeleton";
import { TableSkeleton } from "@/components/TableSkeleton";
import { ShiftAnalyticsChart } from "@/components/ShiftAnalyticsChart";
import { ConnectionError } from "@/components/ErrorBoundary";

interface Survey {
  id: string;
  location: string;
  answer: string;
  timestamp: string;
  device?: { name: string };
}

interface Device {
  id: string;
  name: string;
  location: string;
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
}

interface SurveyStats {
  total: number;
  excellent: number;
  satisfactory: number;
  average: number;
  percentages: {
    excellent: number;
    satisfactory: number;
    average: number;
  };
}

interface DeviceStats {
  total: number;
  active: number;
  inactive: number;
  maintenance: number;
  online: number;
  offline: number;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<SurveyStats | null>(null);
  const [deviceStats, setDeviceStats] = useState<DeviceStats | null>(null);
  const [recentSurveys, setRecentSurveys] = useState<Survey[]>([]);
  const [recentDevices, setRecentDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const hasFetchedRef = useRef(false);

  const surveyColumns = useMemo<ColumnDef<Survey>[]>(
    () => [
      { id: "location", header: "Location", cell: (s) => s.location },
      { id: "answer", header: "Rating", cell: (s) => s.answer },
      { id: "device", header: "Device", cell: (s) => s.device?.name || "N/A" },
    ],
    []
  );

  const deviceColumns = useMemo<ColumnDef<Device>[]>(
    () => [
      { id: "name", header: "Name", cell: (d) => d.name },
      { id: "location", header: "Location", cell: (d) => d.location },
      { id: "status", header: "Status", cell: (d) => d.status },
    ],
    []
  );

  const fetchData = useCallback(async () => {
    if (!session?.user?.accessToken) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const headers = { Authorization: `Bearer ${session.user.accessToken}` };
      const [statsRes, deviceStatsRes, surveysRes, devicesRes] =
        await Promise.all([
          apiClient.get("/surveys/stats", { headers }),
          apiClient.get("/devices/stats", { headers }),
          apiClient.get("/surveys?limit=5&sortBy=createdAt&sortOrder=desc", {
            headers,
          }),
          apiClient.get("/devices?limit=5&sortBy=createdAt&sortOrder=desc", {
            headers,
          }),
        ]);

      setStats(statsRes.data.data);
      setDeviceStats(deviceStatsRes.data.data);
      setRecentSurveys(surveysRes.data.data);
      setRecentDevices(devicesRes.data.data);
      hasFetchedRef.current = true;
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.accessToken]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.replace("/login");
      return;
    }

    // Only fetch if we haven't fetched before or if data is stale
    if (!hasFetchedRef.current) {
      fetchData();
    }
  }, [session, status, router, fetchData]);

  // Handle proper error messages for rate limiting
  const getErrorMessage = (error: unknown) => {
    if (error && typeof error === "object" && "response" in error) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 429) {
        return "Too many requests. Please wait a moment before trying again.";
      }
      if (axiosError.response?.status && axiosError.response.status >= 500) {
        return "Server error. Please try again later.";
      }
      if (axiosError.response?.status === 401) {
        return "Authentication failed. Please log in again.";
      }
    }
    return "A connection error occurred while fetching dashboard data.";
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <span className="text-muted-foreground text-base">
            Welcome, {session?.user?.name ?? "System Administrator"}!
          </span>
        </div>

        {/* Survey Stats Skeleton */}
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-xl font-bold">Survey Stats</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        {/* Device Stats Skeleton */}
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-xl font-bold">Device Stats</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        {/* Tables Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 mb-8">
          <Card>
            <CardContent className="p-2">
              <TableSkeleton columns={3} />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2">
              <TableSkeleton columns={3} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ConnectionError
        message={getErrorMessage(error)}
        onRetry={() => {
          hasFetchedRef.current = false;
          fetchData();
        }}
        showRetry
      />
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <span className="text-muted-foreground text-base">
          Welcome,{" "}
          <span className="font-semibold text-primary">
            {session?.user?.name ?? "System Administrator"}
          </span>
          !
        </span>
      </div>

      {/* Survey Stats Section */}
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-xl font-bold">Survey Stats</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <StatCard
          title="Total Surveys"
          value={stats?.total}
          icon={<BarChart3 className="text-blue-500" size={20} />}
          colors="from-blue-50 to-blue-100"
          textColor="text-blue-700"
        />
        <StatCard
          title="Excellent"
          value={stats?.excellent}
          percentage={stats?.percentages?.excellent}
          icon={<Star className="text-green-500" size={20} />}
          colors="from-green-50 to-green-100"
          textColor="text-green-700"
        />
        <StatCard
          title="Satisfactory"
          value={stats?.satisfactory}
          percentage={stats?.percentages?.satisfactory}
          icon={<ThumbsUp className="text-yellow-500" size={20} />}
          colors="from-yellow-50 to-yellow-100"
          textColor="text-yellow-700"
        />
        <StatCard
          title="Average"
          value={stats?.average}
          percentage={stats?.percentages?.average}
          icon={<ThumbsDown className="text-red-500" size={20} />}
          colors="from-red-50 to-red-100"
          textColor="text-red-700"
        />
      </div>

      {/* Device Stats Section */}
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-xl font-bold">Device Stats</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard
          title="Total Devices"
          value={deviceStats?.total}
          icon={<PowerIcon className="text-gray-500" size={20} />}
          colors="from-gray-50 to-gray-100"
          textColor="text-gray-700"
        />
        <StatCard
          title="Active"
          value={deviceStats?.active}
          icon={<PowerIcon className="text-green-500" size={20} />}
          colors="from-green-50 to-green-100"
          textColor="text-green-700"
        />
        <StatCard
          title="Inactive"
          value={deviceStats?.inactive}
          icon={<PowerOffIcon className="text-red-500" size={20} />}
          colors="from-red-50 to-red-100"
          textColor="text-red-700"
        />
        <StatCard
          title="Maintenance"
          value={deviceStats?.maintenance}
          icon={<SettingsIcon className="text-yellow-500" size={20} />}
          colors="from-yellow-50 to-yellow-100"
          textColor="text-yellow-700"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 mb-8">
        {/* Recent Surveys Card */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Surveys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border mb-6 px-5">
              <DynamicTable
                columns={surveyColumns}
                data={recentSurveys}
                emptyStateMessage="No recent surveys"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Link
              href="/admin/surveys"
              className="flex items-center gap-1 text-primary hover:underline text-sm font-medium w-full justify-end"
            >
              View all <ChevronRight size={16} />
            </Link>
          </CardFooter>
        </Card>

        {/* Recent Devices Card */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border mb-6 px-5">
              <DynamicTable
                columns={deviceColumns}
                data={recentDevices}
                emptyStateMessage="No recent devices"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Link
              href="/admin/devices"
              className="flex items-center gap-1 text-primary hover:underline text-sm font-medium w-full justify-end"
            >
              View all <ChevronRight size={16} />
            </Link>
          </CardFooter>
        </Card>
      </div>

      {/* Main Analytics Chart - Full Width at Bottom */}
      <div className="mb-8">
        <ShiftAnalyticsChart />
      </div>
    </div>
  );
}
