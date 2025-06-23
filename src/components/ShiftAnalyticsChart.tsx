"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { CalendarIcon, FilterIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { apiClient } from "@/lib/api/client";
import { useSession } from "next-auth/react";
import { ChartSkeleton } from "./ChartSkeleton";

interface ShiftAnalyticsData {
  chartData: Array<{
    shift: string;
    excellent: number;
    satisfactory: number;
    average: number;
  }>;
  summary: {
    total: number;
    byShift: {
      morning: number;
      day: number;
      night: number;
    };
  };
}

interface ShiftAnalyticsChartProps {
  className?: string;
}

export function ShiftAnalyticsChart({ className }: ShiftAnalyticsChartProps) {
  const { data: session } = useSession();
  const [data, setData] = useState<ShiftAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);
  const devicesFetchedRef = useRef(false);

  // Staging filter states for UI controls
  const [selectedDevice, setSelectedDevice] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Applied filter states for API calls
  const [appliedSelectedDevice, setAppliedSelectedDevice] =
    useState<string>("all");
  const [appliedDateRange, setAppliedDateRange] = useState<
    DateRange | undefined
  >();

  const [devices, setDevices] = useState<
    Array<{ id: string; deviceId: string; name: string }>
  >([]);
  const [filtersOpen, setFiltersOpen] = useState(true);

  // Fetch devices for filter - only once
  useEffect(() => {
    const fetchDevices = async () => {
      if (!session?.user?.accessToken || devicesFetchedRef.current) return;

      try {
        const response = await apiClient.get("/devices", {
          headers: { Authorization: `Bearer ${session.user.accessToken}` },
        });

        // Filter out any devices with empty or invalid data
        const validDevices = (response.data.data || []).filter(
          (device: { id: string; deviceId: string; name: string }) =>
            device &&
            device.id &&
            device.id.trim() !== "" &&
            device.deviceId &&
            device.deviceId.trim() !== "" &&
            device.name &&
            device.name.trim() !== ""
        );
        setDevices(validDevices);
        devicesFetchedRef.current = true;
      } catch (err) {
        console.error("Failed to fetch devices:", err);
        setDevices([]);
      }
    };

    fetchDevices();
  }, [session?.user?.accessToken]);

  const fetchAnalytics = async () => {
    if (!session?.user?.accessToken) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (appliedSelectedDevice && appliedSelectedDevice !== "all") {
        params.append("deviceId", appliedSelectedDevice);
      }
      if (appliedDateRange?.from)
        params.append(
          "startDate",
          appliedDateRange.from.toISOString().split("T")[0]
        );
      if (appliedDateRange?.to)
        params.append(
          "endDate",
          appliedDateRange.to.toISOString().split("T")[0]
        );

      const url = `/surveys/shift-analytics?${params.toString()}`;

      const response = await apiClient.get(url, {
        headers: { Authorization: `Bearer ${session.user.accessToken}` },
      });

      setData(response.data.data);
      hasFetchedRef.current = true;
    } catch (err) {
      const error = err as { response?: { status?: number }; message?: string };
      let errorMessage = "Failed to fetch analytics";

      if (error.response?.status === 429) {
        errorMessage = "Too many requests. Please wait before trying again.";
      } else if (error.response?.status && error.response.status >= 500) {
        errorMessage = "Server error. Please try again later.";
      } else if (error.message) {
        errorMessage = `Failed to fetch analytics: ${error.message}`;
      }

      setError(errorMessage);
      console.error("Analytics fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch - only once
  useEffect(() => {
    if (session?.user?.accessToken && !hasFetchedRef.current) {
      fetchAnalytics();
    }
  }, [session?.user?.accessToken]);

  const handleApplyFilters = () => {
    setAppliedSelectedDevice(selectedDevice);
    setAppliedDateRange(dateRange);
    // Reset the fetch flag and trigger a new fetch
    hasFetchedRef.current = false;
    // Use setTimeout to ensure state updates are processed
    setTimeout(() => {
      fetchAnalytics();
    }, 0);
  };

  const clearFilters = () => {
    setSelectedDevice("all");
    setDateRange(undefined);
    setAppliedSelectedDevice("all");
    setAppliedDateRange(undefined);
    // Reset and refetch with cleared filters
    hasFetchedRef.current = false;
    setTimeout(() => {
      fetchAnalytics();
    }, 0);
  };

  const setQuickRange = (type: "today" | "week" | "month" | "last7") => {
    const now = new Date();
    let from: Date;
    const to = new Date(now);
    to.setHours(23, 59, 59, 999); // End of day

    switch (type) {
      case "today":
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        from = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - now.getDay()
        );
        break;
      case "month":
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "last7":
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        from.setHours(0, 0, 0, 0); // Start of day
        break;
    }
    setDateRange({ from, to });
  };

  const isFiltered = useMemo(() => {
    return selectedDevice !== "all" || dateRange !== undefined;
  }, [selectedDevice, dateRange]);

  const chartColors = {
    excellent: "#22c55e",
    satisfactory: "#eab308",
    average: "#ef4444",
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FilterIcon size={20} />
            Survey Analytics by Shift
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FilterIcon size={20} />
            Survey Analytics by Shift
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-red-500">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FilterIcon size={20} />
            Survey Analytics by Shift
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              Filters
            </Button>
            {isFiltered && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        {filtersOpen && (
          <div className="border-t mt-4 -mx-6 px-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Device</label>
                <Select
                  value={selectedDevice}
                  onValueChange={setSelectedDevice}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Devices" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Devices</SelectItem>
                    {devices
                      .filter(
                        (device) =>
                          device.id &&
                          device.id.trim() !== "" &&
                          device.deviceId &&
                          device.deviceId.trim() !== "" &&
                          device.name &&
                          device.name.trim() !== ""
                      )
                      .map((device) => (
                        <SelectItem key={device.id} value={device.deviceId}>
                          {device.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Date Range
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                    />
                    <div className="p-2 border-t border-muted">
                      <p className="text-xs text-muted-foreground px-1 mb-2">
                        Quick Select
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="justify-start font-normal"
                          onClick={() => setQuickRange("today")}
                        >
                          Today
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="justify-start font-normal"
                          onClick={() => setQuickRange("last7")}
                        >
                          Last 7 days
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="justify-start font-normal"
                          onClick={() => setQuickRange("week")}
                        >
                          This Week
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="justify-start font-normal"
                          onClick={() => setQuickRange("month")}
                        >
                          This Month
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-end">
                <Button onClick={handleApplyFilters} className="w-full">
                  Apply Filters
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {data && data.chartData.length > 0 ? (
          <div className="w-full h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                barCategoryGap="20%"
                barGap={2}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="shift"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #ccc",
                    borderRadius: "8px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="excellent"
                  fill={chartColors.excellent}
                  name="Excellent"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="satisfactory"
                  fill={chartColors.satisfactory}
                  name="Satisfactory"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="average"
                  fill={chartColors.average}
                  name="Average"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-80 text-muted-foreground">
            No data available for the selected filters
          </div>
        )}

        {/* Summary Stats */}
        {data && (
          <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {data.summary.total}
              </div>
              <div className="text-sm text-muted-foreground">Total Surveys</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {data.summary.byShift.morning}
              </div>
              <div className="text-sm text-muted-foreground">Morning</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {data.summary.byShift.day}
              </div>
              <div className="text-sm text-muted-foreground">Day</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {data.summary.byShift.night}
              </div>
              <div className="text-sm text-muted-foreground">Night</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
