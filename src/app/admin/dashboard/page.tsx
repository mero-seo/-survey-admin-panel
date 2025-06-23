"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
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
import { useToast } from "@/lib/hooks/useToast";

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
  const { toast } = useToast();

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
    } catch (err) {
      setError(err);
      toast.error("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [session, toast]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.replace("/login");
      return;
    }

    fetchData();
  }, [session, status, router, fetchData]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-500">
            Welcome, {session?.user?.name ?? "Admin"}!
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TableSkeleton columns={3} />
          <TableSkeleton columns={3} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ConnectionError
        message="A connection error occurred while fetching dashboard data."
        onRetry={fetchData}
        showRetry
      />
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-500">
          Welcome, {session?.user?.name ?? "System Administrator"}!
        </p>
      </div>

      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">Survey Stats</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
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
      </div>

      <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <ShiftAnalyticsChart />

        <Card>
          <CardHeader>
            <CardTitle>Device Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center text-gray-600">
                  <PowerIcon className="mr-2 h-5 w-5 text-green-500" />
                  Online Devices
                </span>
                <span className="font-bold">{deviceStats?.online ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center text-gray-600">
                  <PowerOffIcon className="mr-2 h-5 w-5 text-red-500" />
                  Offline Devices
                </span>
                <span className="font-bold">{deviceStats?.offline ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center text-gray-600">
                  <SettingsIcon className="mr-2 h-5 w-5 text-yellow-500" />
                  Maintenance
                </span>
                <span className="font-bold">
                  {deviceStats?.maintenance ?? 0}
                </span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Link
              href="/admin/devices"
              className="flex items-center text-sm text-blue-600 hover:underline"
            >
              View All Devices <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </CardFooter>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Surveys</CardTitle>
          </CardHeader>
          <CardContent>
            <DynamicTable
              columns={surveyColumns}
              data={recentSurveys}
              emptyStateMessage="No recent surveys found."
            />
          </CardContent>
          <CardFooter className="flex justify-end">
            <Link
              href="/admin/surveys"
              className="flex items-center text-sm text-blue-600 hover:underline"
            >
              View All Surveys <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <DynamicTable
              columns={deviceColumns}
              data={recentDevices}
              emptyStateMessage="No recent devices found."
            />
          </CardContent>
          <CardFooter className="flex justify-end">
            <Link
              href="/admin/devices"
              className="flex items-center text-sm text-blue-600 hover:underline"
            >
              View All Devices <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
