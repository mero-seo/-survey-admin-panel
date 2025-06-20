"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Star, ThumbsUp, ThumbsDown, MoreHorizontal, MapPin, PowerIcon, PowerOffIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { motion } from "framer-motion";

// Animation Variants for Framer Motion
const cardVariants = {
  rest: { y: 0 },
  hover: { 
    y: -8,
    transition: { type: 'spring', stiffness: 300, damping: 20 }
  },
} as const;

const shapeVariants = {
  rest: { x: 0, y: 0, opacity: 0.7 },
  hover: {
    x: 5,
    y: -5,
    opacity: 1,
    transition: { type: 'spring', stiffness: 400, damping: 20, duration: 0.4 },
  },
} as const;

const textVariants = {
    rest: { scale: 1 },
    hover: {
        scale: 1.05,
        transition: { type: 'spring', stiffness: 300 }
    }
} as const;

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
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get(`${process.env.NEXT_PUBLIC_API_URL}/surveys/stats`, {
          headers: {
            Authorization: `Bearer ${session.user.accessToken}`,
          },
        });
        setStats(response.data.data);
        setIsSurveyDummy(false);
      } catch {
        // Use dummy data for now if API fails
        setStats({
          total: 16,
          excellent: 10,
          satisfactory: 5,
          average: 1,
          percentages: { excellent: 63, satisfactory: 31, average: 6 },
          byLocation: [
            {
              location: "Aditya desk",
              total: 4,
              excellent: 2,
              satisfactory: 2,
              average: 0,
              percentages: { excellent: 50, satisfactory: 50, average: 0 },
            },
            {
              location: "Front",
              total: 6,
              excellent: 3,
              satisfactory: 2,
              average: 1,
              percentages: { excellent: 50, satisfactory: 33, average: 17 },
            },
            {
              location: "Iku",
              total: 6,
              excellent: 5,
              satisfactory: 1,
              average: 0,
              percentages: { excellent: 83, satisfactory: 17, average: 0 },
            },
          ],
          byDate: [
            { date: "2025-06-20", total: 16, excellent: 0, satisfactory: 0, average: 0 },
          ],
        });
        setIsSurveyDummy(true);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [session, status, router]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session || !session.user) return;
    const fetchDeviceStats = async () => {
      try {
        const response = await apiClient.get(`${process.env.NEXT_PUBLIC_API_URL}/devices/stats`, {
          headers: {
            Authorization: `Bearer ${session.user.accessToken}`,
          },
        });
        setDeviceStats(response.data.data);
        console.log(response.data.data);
        setIsDeviceDummy(false);
      } catch {        // Use dummy data for now if API fails
        setStats({
          total: 16,
          excellent: 10,
          satisfactory: 5,
          average: 1,
          percentages: { excellent: 63, satisfactory: 31, average: 6 },
          byLocation: [
            {
              location: "Aditya desk",
              total: 4,
              excellent: 2,
              satisfactory: 2,
              average: 0,
              percentages: { excellent: 50, satisfactory: 50, average: 0 },
            },
            {
              location: "Front",
              total: 6,
              excellent: 3,
              satisfactory: 2,
              average: 1,
              percentages: { excellent: 50, satisfactory: 33, average: 17 },
            },
            {
              location: "Iku",
              total: 6,
              excellent: 5,
              satisfactory: 1,
              average: 0,
              percentages: { excellent: 83, satisfactory: 17, average: 0 },
            },
          ],
          byDate: [
            { date: "2025-06-20", total: 16, excellent: 0, satisfactory: 0, average: 0 },
          ],
        });
        setDeviceStats({
          total: 10,
          active: 7,
          inactive: 1,
          maintenance: 1,
          online: 6,
          offline: 4
        });
        setIsDeviceDummy(true);
      }
    };
    fetchDeviceStats();
  }, [session, status]);

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
        {[
          { title: "Total Surveys", value: stats?.total, icon: <BarChart3 className="text-blue-500" size={20} />, colors: "from-blue-50 to-blue-100", textColor: "text-blue-700", mainValueClass: "text-3xl" },
          { title: "Excellent", value: stats?.excellent, percentage: stats?.percentages?.excellent, icon: <Star className="text-green-500" size={20} />, colors: "from-green-50 to-green-100", textColor: "text-green-700" },
          { title: "Satisfactory", value: stats?.satisfactory, percentage: stats?.percentages?.satisfactory, icon: <ThumbsUp className="text-yellow-500" size={20} />, colors: "from-yellow-50 to-yellow-100", textColor: "text-yellow-700" },
          { title: "Average", value: stats?.average, percentage: stats?.percentages?.average, icon: <ThumbsDown className="text-red-500" size={20} />, colors: "from-red-50 to-red-100", textColor: "text-red-700" },
          { title: "Avg. Rating", value: averageRating?.toFixed(2), icon: <Star className="text-indigo-500" size={20} />, colors: "from-indigo-50 to-indigo-100", textColor: "text-indigo-700", mainValueClass: "text-3xl" },
        ].map((card, idx) => (
            <motion.div
              key={idx}
              variants={cardVariants}
              initial="rest"
              whileHover="hover"
              animate="rest"
            >
              <Card className={`shadow-sm border-0 bg-gradient-to-br ${card.colors} relative overflow-hidden h-full`}>
                <motion.div variants={shapeVariants} className="absolute -bottom-4 -right-4 w-16 h-16 bg-white/10 rounded-full" />
                <motion.div variants={shapeVariants} className="absolute top-4 -left-4 w-20 h-20 bg-white/10 rounded-lg rotate-12" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    {card.icon} {card.title}
                  </CardTitle>
                  {card.percentage !== undefined && <span className={`${card.textColor} font-bold`}>{card.percentage}%</span>}
                </CardHeader>
                <CardContent className="relative z-10">
                  <motion.div variants={textVariants} className={`font-bold ${card.textColor} ${card.mainValueClass || 'text-2xl'}`}>
                    {card.value ?? 0}
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
        ))}
      </div>

      {/* Device Stats Section */}
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-xl font-bold">Device Stats</h2>
        <span className={`px-2 py-1 rounded text-xs font-semibold ${isDeviceDummy ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
          {isDeviceDummy ? "Dummy Data" : "Live from API"}
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {[
            { title: "Total Devices", value: deviceStats?.total, icon: <PowerIcon className="text-gray-500" size={20} />, colors: "from-gray-50 to-gray-100", textColor: "text-gray-700" },
            { title: "Active", value: deviceStats?.active, icon: <PowerIcon className="text-green-500" size={20} />, colors: "from-green-50 to-green-100", textColor: "text-green-700" },
            { title: "Inactive", value: deviceStats?.inactive, icon: <PowerOffIcon className="text-red-500" size={20} />, colors: "from-red-50 to-red-100", textColor: "text-red-700" },
            { title: "Maintenance", value: deviceStats?.maintenance, icon: <SettingsIcon className="text-yellow-500" size={20} />, colors: "from-yellow-50 to-yellow-100", textColor: "text-yellow-700" },
        ].map((card, idx) => (
            <motion.div
              key={idx}
              variants={cardVariants}
              initial="rest"
              whileHover="hover"
              animate="rest"
            >
              <Card className={`shadow-sm border-0 bg-gradient-to-br ${card.colors} relative overflow-hidden h-full`}>
                 <motion.div variants={shapeVariants} className="absolute -bottom-4 -right-4 w-16 h-16 bg-white/10 rounded-full" />
                <motion.div variants={shapeVariants} className="absolute top-4 -left-4 w-20 h-20 bg-white/10 rounded-lg rotate-12" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    {card.icon} {card.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                  <motion.div variants={textVariants} className={`text-2xl font-bold ${card.textColor}`}>
                    {card.value ?? 0}
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
        ))}
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