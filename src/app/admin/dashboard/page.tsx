"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { BarChart3, Star, ThumbsUp, ThumbsDown, MoreHorizontal, MapPin, PowerIcon, PowerOffIcon, SettingsIcon, ChevronRight } from "lucide-react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { StatCard } from "@/components/StatCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Survey {
  id: string;
  location: string;
  answer: string;
  timestamp: string;
  device?: { name: string; };
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
  byLocation: Array<{
    location: string;
    total: number;
    excellent: number;
    satisfactory: number;
    average: number;
    percentages: {
      excellent: number;
      satisfactory: number;
      average: number;
    };
  }>;
  byDate: Array<{
    date: string;
    total: number;
    excellent: number;
    satisfactory: number;
    average: number;
  }>;
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
  const [error, setError] = useState<string | null>(null);
  const [isSurveyDummy, setIsSurveyDummy] = useState(false);
  const [isDeviceDummy, setIsDeviceDummy] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || !session.user) {
      router.replace("/login");
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const headers = { Authorization: `Bearer ${session.user.accessToken}` };
        const [statsRes, deviceStatsRes, surveysRes, devicesRes] = await Promise.all([
          apiClient.get('/surveys/stats', { headers }),
          apiClient.get('/devices/stats', { headers }),
          apiClient.get('/surveys?limit=5&sortBy=createdAt&sortOrder=desc', { headers }),
          apiClient.get('/devices?limit=5&sortBy=createdAt&sortOrder=desc', { headers }),
        ]);

        setStats(statsRes.data.data);
        setDeviceStats(deviceStatsRes.data.data);
        setRecentSurveys(surveysRes.data.data);
        setRecentDevices(devicesRes.data.data);
        
        setIsSurveyDummy(false);
        setIsDeviceDummy(false);

      } catch (err) {
        const error = err as Error;
        setError(`Failed to fetch dashboard data. Displaying dummy data. ${error.message}`);
        console.error(err);

        // Dummy data for fallback
        setIsSurveyDummy(true);
        setIsDeviceDummy(true);
        setStats({
          total: 16, excellent: 10, satisfactory: 5, average: 1,
          percentages: { excellent: 63, satisfactory: 31, average: 6 },
          byLocation: [], byDate: [],
        });
        setDeviceStats({ total: 10, active: 7, inactive: 1, maintenance: 1, online: 6, offline: 4 });
        setRecentSurveys([
          { id: '1', location: 'Lobby', answer: 'Excellent', timestamp: new Date().toISOString(), device: { name: 'Tablet 1' } },
          { id: '2', location: 'Front Desk', answer: 'Satisfactory', timestamp: new Date().toISOString(), device: { name: 'Tablet 2' } },
        ]);
        setRecentDevices([
          { id: '1', name: 'Lobby Tablet', location: 'Lobby', status: 'ACTIVE' },
          { id: '2', name: 'Front Desk Kiosk', location: 'Front Desk', status: 'INACTIVE' },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session, status, router]);

  const averageRating = calcAverageRating(stats);

  if (status === "loading" || loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading dashboard...</div>;
  }
  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }
  if (!session || !session.user) {
    return null;
  }
  const user = session.user;

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <span className="text-muted-foreground text-base">Welcome, <span className="font-semibold text-primary">{user.name}</span>!</span>
      </div>

      {/* Survey Stats Section */}
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-xl font-bold">Survey Stats</h2>
        <span className={`px-2 py-1 rounded text-xs font-semibold ${isSurveyDummy ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
          {isSurveyDummy ? "Dummy Data" : "Live from API"}
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-5 mb-8">
        <StatCard title="Total Surveys" value={stats?.total} icon={<BarChart3 className="text-blue-500" size={20} />} colors="from-blue-50 to-blue-100" textColor="text-blue-700" mainValueClass="text-3xl" />
        <StatCard title="Excellent" value={stats?.excellent} percentage={stats?.percentages?.excellent} icon={<Star className="text-green-500" size={20} />} colors="from-green-50 to-green-100" textColor="text-green-700" />
        <StatCard title="Satisfactory" value={stats?.satisfactory} percentage={stats?.percentages?.satisfactory} icon={<ThumbsUp className="text-yellow-500" size={20} />} colors="from-yellow-50 to-yellow-100" textColor="text-yellow-700" />
        <StatCard title="Average" value={stats?.average} percentage={stats?.percentages?.average} icon={<ThumbsDown className="text-red-500" size={20} />} colors="from-red-50 to-red-100" textColor="text-red-700" />
        <StatCard title="Avg. Rating" value={averageRating?.toFixed(2)} icon={<Star className="text-indigo-500" size={20} />} colors="from-indigo-50 to-indigo-100" textColor="text-indigo-700" mainValueClass="text-3xl" />
      </div>

      {/* Device Stats Section */}
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-xl font-bold">Device Stats</h2>
        <span className={`px-2 py-1 rounded text-xs font-semibold ${isDeviceDummy ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
          {isDeviceDummy ? "Dummy Data" : "Live from API"}
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard title="Total Devices" value={deviceStats?.total} icon={<PowerIcon className="text-gray-500" size={20} />} colors="from-gray-50 to-gray-100" textColor="text-gray-700" />
        <StatCard title="Active" value={deviceStats?.active} icon={<PowerIcon className="text-green-500" size={20} />} colors="from-green-50 to-green-100" textColor="text-green-700" />
        <StatCard title="Inactive" value={deviceStats?.inactive} icon={<PowerOffIcon className="text-red-500" size={20} />} colors="from-red-50 to-red-100" textColor="text-red-700" />
        <StatCard title="Maintenance" value={deviceStats?.maintenance} icon={<SettingsIcon className="text-yellow-500" size={20} />} colors="from-yellow-50 to-yellow-100" textColor="text-yellow-700" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 mb-8">
        {/* Recent Surveys Card */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Surveys</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Location</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Device</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSurveys.length > 0 ? (
                  recentSurveys.map(survey => (
                    <TableRow key={survey.id}>
                      <TableCell>{survey.location}</TableCell>
                      <TableCell>{survey.answer}</TableCell>
                      <TableCell>{survey.device?.name || 'N/A'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">No recent surveys</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter>
             <Link href="/admin/surveys" className="flex items-center gap-1 text-primary hover:underline text-sm font-medium w-full justify-end">
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
             <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentDevices.length > 0 ? (
                  recentDevices.map(device => (
                    <TableRow key={device.id}>
                      <TableCell>{device.name}</TableCell>
                      <TableCell>{device.location}</TableCell>
                      <TableCell>{device.status}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">No recent devices</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
           <CardFooter>
             <Link href="/admin/devices" className="flex items-center gap-1 text-primary hover:underline text-sm font-medium w-full justify-end">
              View all <ChevronRight size={16} />
            </Link>
          </CardFooter>
        </Card>
      </div>

      {/* Trends Over Time */}
      <div className="grid gap-4 md:grid-cols-2">

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2"><BarChart3 size={20} /> Survey Trends (by Date)</CardTitle>
          <Link href="/admin/surveys" className="flex items-center gap-1 text-primary hover:underline text-sm font-medium">
            More <MoreHorizontal size={16} />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="w-full h-64">
            {(() => {
              if (stats?.byDate?.length) {
                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.byDate}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      barCategoryGap="20%"
                      barGap={2}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="excellent" fill="rgba(34,197,94,0.7)" name="Excellent" />
                      <Bar dataKey="satisfactory" fill="rgba(234,179,8,0.7)" name="Satisfactory" />
                      <Bar dataKey="average" fill="rgba(239,68,68,0.7)" name="Average" />
                      <Bar dataKey="total" fill="rgba(59,130,246,0.7)" name="Total" />
                    </BarChart>
                  </ResponsiveContainer>
                );
              } else {
                return <div className="flex items-center justify-center h-full text-muted-foreground">No trend data</div>;
              }
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Bar Chart for Location Breakdown (moved below trends) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2"><MapPin size={20} /> Survey Breakdown by Location</CardTitle>
          <Link href="/admin/surveys" className="flex items-center gap-1 text-primary hover:underline text-sm font-medium">
            More <MoreHorizontal size={16} />
          </Link>
        </CardHeader>
        <CardContent>
          {stats && stats.byLocation && stats.byLocation.length ? (
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stats.byLocation}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  barCategoryGap="20%"
                  barGap={2}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="location" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="excellent" fill="rgba(34,197,94,0.7)" name="Excellent" />
                  <Bar dataKey="satisfactory" fill="rgba(234,179,8,0.7)" name="Satisfactory" />
                  <Bar dataKey="average" fill="rgba(239,68,68,0.7)" name="Average" />
                  <Bar dataKey="total" fill="rgba(59,130,246,0.7)" name="Total" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">No location data</div>
          )}
        </CardContent>
      </Card>
      </div>

    </div>
  );
} 