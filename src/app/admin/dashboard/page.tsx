"use client";

import { useEffect, useState, useMemo } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ShiftAnalyticsChart } from "@/components/ShiftAnalyticsChart";
import { ConnectionError, DataUnavailable } from "@/components/ErrorBoundary";
import { useApiError } from "@/lib/hooks/useApiError";
import { useToast } from "@/components/ToastProvider";
import { ConnectionStatus } from "@/components/ConnectionStatus";

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

function calcAverageRating(stats: SurveyStats | null) {
  if (!stats) return null;
  const { excellent, satisfactory, average, total } = stats;
  if (!total) return null;
  // EXCELLENT=3, SATISFACTORY=2, AVERAGE=1
  const avg = (3 * excellent + 2 * satisfactory + 1 * average) / total;
  return avg;
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
  const [isSurveyDummy, setIsSurveyDummy] = useState(false);
  const [isDeviceDummy, setIsDeviceDummy] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const apiError = useApiError(error);
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

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = { Authorization: `Bearer ${session?.user?.accessToken}` };
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

      setIsSurveyDummy(false);
      setIsDeviceDummy(false);
      setRetryCount(0);

      // Show success toast if we were previously showing dummy data
      if (isSurveyDummy || isDeviceDummy) {
        toast.success("Connection restored. Live data is now available.");
      }
    } catch (err) {
      setError(err);
      console.error("Dashboard data fetch error:", err);

      // Only show dummy data for network/server errors, not auth errors
      if (apiError.type === "network" || apiError.type === "server") {
        setIsSurveyDummy(true);
        setIsDeviceDummy(true);
        setStats({
          total: 16,
          excellent: 10,
          satisfactory: 5,
          average: 1,
          percentages: { excellent: 63, satisfactory: 31, average: 6 },
        });
        setDeviceStats({
          total: 10,
          active: 7,
          inactive: 1,
          maintenance: 1,
          online: 6,
          offline: 4,
        });
        setRecentSurveys([
          {
            id: "1",
            location: "Lobby",
            answer: "Excellent",
            timestamp: new Date().toISOString(),
            device: { name: "Tablet 1" },
          },
          {
            id: "2",
            location: "Front Desk",
            answer: "Satisfactory",
            timestamp: new Date().toISOString(),
            device: { name: "Tablet 2" },
          },
        ]);
        setRecentDevices([
          {
            id: "1",
            name: "Lobby Tablet",
            location: "Lobby",
            status: "ACTIVE",
          },
          {
            id: "2",
            name: "Front Desk Kiosk",
            location: "Front Desk",
            status: "INACTIVE",
          },
        ]);

        // Show warning toast for dummy data
        if (!isSurveyDummy && !isDeviceDummy) {
          toast.warning(
            "Showing sample data due to connection issues. Some features may be limited."
          );
        }
      } else if (apiError.type === "auth") {
        toast.error("Authentication failed. Please log in again.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "loading") return;
    if (!session || !session.user) {
      router.replace("/login");
      return;
    }

    fetchData();
  }, [session, status, router]);

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
    fetchData();
  };

  // Handle authentication errors
  if (apiError.type === "auth") {
    return <ConnectionError message={apiError.message} showRetry={false} />;
  }

  // Handle non-retryable errors
  if (error && !apiError.retryable && !isSurveyDummy) {
    return (
      <DataUnavailable
        title="Unable to Load Dashboard"
        message={apiError.message}
      />
    );
  }

  // Handle retryable errors with retry limit
  if (error && apiError.retryable && retryCount >= 3) {
    return (
      <ConnectionError
        message="Unable to connect after multiple attempts. Please check your connection and try again later."
        showRetry={false}
      />
    );
  }

  // Show retry option for retryable errors
  if (error && apiError.retryable && retryCount < 3) {
    return (
      <ConnectionError
        message={apiError.message}
        onRetry={handleRetry}
        showRetry={true}
      />
    );
  }

  const averageRating = calcAverageRating(stats);

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-64" />
        </div>
        {/* Skeletons for Stat Cards */}
        <div className="grid gap-4 md:grid-cols-5 mb-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        {/* Skeletons for Tables */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 mb-8">
          <Card>
            <CardContent className="p-2">
              <TableSkeleton columns={3} noHeader />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-2">
              <TableSkeleton columns={3} noHeader />
            </CardContent>
          </Card>
        </div>
        {/* Skeleton for Chart */}
        <div className="mb-8">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!session || !session.user) {
    return null;
  }
  const user = session.user;

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <span className="text-muted-foreground text-base">
          Welcome,{" "}
          <span className="font-semibold text-primary">{user.name}</span>!
        </span>
      </div>

      {/* Survey Stats Section */}
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-xl font-bold">Survey Stats</h2>
        <ConnectionStatus isConnected={!error} isDummyData={isSurveyDummy} />
      </div>
      <div className="grid gap-4 md:grid-cols-5 mb-8">
        <StatCard
          title="Total Surveys"
          value={stats?.total}
          icon={<BarChart3 className="text-blue-500" size={20} />}
          colors="from-blue-50 to-blue-100"
          textColor="text-blue-700"
          mainValueClass="text-3xl"
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
        <StatCard
          title="Avg. Rating"
          value={averageRating?.toFixed(2)}
          icon={<Star className="text-indigo-500" size={20} />}
          colors="from-indigo-50 to-indigo-100"
          textColor="text-indigo-700"
          mainValueClass="text-3xl"
        />
      </div>

      {/* Device Stats Section */}
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-xl font-bold">Device Stats</h2>
        <ConnectionStatus isConnected={!error} isDummyData={isDeviceDummy} />
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

      {/* Main Analytics Chart */}
      <div className="mb-8">
        <ShiftAnalyticsChart />
      </div>
    </div>
  );
}
