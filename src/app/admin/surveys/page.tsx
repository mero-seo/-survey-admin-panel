"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";
import { useSession } from "next-auth/react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { TimePicker } from "@/components/ui/time-picker";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon, XIcon, BarChart3, Star, ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { StatCard } from "@/components/ui/StatCard";

interface SurveyStats {
  total: number;
  excellent: number;
  satisfactory: number;
  average: number;
}

interface Survey {
  id: string;
  deviceInfo: { model: string; os: string; version: string; appVersion: string };
  deviceId: string;
  location: string;
  answer: string;
  timestamp: string;
  syncStatus: string;
  createdAt: string;
  device?: { name: string; status: string };
}

const dummySurveys: Survey[] = [
  {
    id: "1",
    deviceInfo: { model: "Device A", os: "Android", version: "12", appVersion: "1.0" },
    deviceId: "A123",
    location: "Front Desk",
    answer: "Excellent",
    timestamp: "2024-06-01T10:00:00",
    syncStatus: "SYNCED",
    createdAt: "2024-06-01T10:00:00",
    device: { name: "Device A", status: "Online" }
  },
  {
    id: "2",
    deviceInfo: { model: "Device B", os: "iOS", version: "15.4.1", appVersion: "2.0" },
    deviceId: "B456",
    location: "Lobby",
    answer: "Satisfactory",
    timestamp: "2024-06-02T11:00:00",
    syncStatus: "NOT_SYNCED",
    createdAt: "2024-06-02T11:00:00",
    device: { name: "Device B", status: "Offline" }
  }
];

const timeShifts = [
  { label: 'Morning (5:00AM–11:59AM)', value: 'morning', start: '05:00', end: '11:59' },
  { label: 'Day (12:00PM–6:59PM)', value: 'day', start: '12:00', end: '18:59' },
  { label: 'Night (7:00PM–4:59AM)', value: 'night', start: '19:00', end: '04:59' },
];

function isWithinTimeShift(date: Date, shift: string) {
  if (!shift) return true;
  const hour = date.getHours();
  const minute = date.getMinutes();
  if (shift === 'morning') {
    return (hour > 5 || (hour === 5 && minute >= 0)) && (hour < 12 || (hour === 11 && minute <= 59));
  }
  if (shift === 'day') {
    return (hour > 12 || (hour === 12 && minute >= 0)) && (hour < 19 || (hour === 18 && minute <= 59));
  }
  if (shift === 'night') {
    return (hour > 19 || (hour === 19 && minute >= 0)) || (hour < 5 || (hour === 4 && minute <= 59));
  }
  return true;
}

const dummyAnalytics = [
  { type: "Excellent", value: 12 },
  { type: "Satisfactory", value: 6 },
  { type: "Average", value: 2 }
];


interface DummyStats {
  locationBreakdown: Array<{
    location: string;
    total: number;
    excellent: number;
    satisfactory: number;
    average: number;
  }>;
  dailyBreakdown: Array<{
    date: string;
    total: number;
    excellent: number;
    satisfactory: number;
    average: number;
  }>;
}

const dummyStats: DummyStats = {
  locationBreakdown: [
    { location: "Front Desk", total: 40, excellent: 20, satisfactory: 15, average: 5 },
    { location: "Lobby", total: 35, excellent: 15, satisfactory: 12, average: 8 },
    { location: "Cafeteria", total: 25, excellent: 10, satisfactory: 10, average: 5 },
    { location: "Waiting Area", total: 30, excellent: 12, satisfactory: 13, average: 5 },
    { location: "Reception", total: 20, excellent: 8, satisfactory: 7, average: 5 },
  ],
  dailyBreakdown: [
    { date: "2024-06-01", total: 10, excellent: 5, satisfactory: 3, average: 2 },
    { date: "2024-06-02", total: 12, excellent: 6, satisfactory: 4, average: 2 },
    { date: "2024-06-03", total: 15, excellent: 7, satisfactory: 6, average: 2 },
    { date: "2024-06-04", total: 18, excellent: 8, satisfactory: 7, average: 3 },
    { date: "2024-06-05", total: 20, excellent: 10, satisfactory: 7, average: 3 },
    { date: "2024-06-06", total: 17, excellent: 8, satisfactory: 6, average: 3 },
    { date: "2024-06-07", total: 22, excellent: 11, satisfactory: 8, average: 3 },
    { date: "2024-06-08", total: 19, excellent: 9, satisfactory: 7, average: 3 },
    { date: "2024-06-09", total: 16, excellent: 7, satisfactory: 6, average: 3 },
    { date: "2024-06-10", total: 21, excellent: 10, satisfactory: 8, average: 3 },
    { date: "2024-06-11", total: 18, excellent: 8, satisfactory: 7, average: 3 },
    { date: "2024-06-12", total: 20, excellent: 9, satisfactory: 8, average: 3 },
    { date: "2024-06-13", total: 23, excellent: 11, satisfactory: 9, average: 3 },
    { date: "2024-06-14", total: 17, excellent: 8, satisfactory: 6, average: 3 },
    { date: "2024-06-15", total: 19, excellent: 9, satisfactory: 7, average: 3 },
  ]
};

// Types for analytics breakdowns
type Breakdown = { date: string; total: number; excellent: number; satisfactory: number; average: number };
type LocationBreakdown = { location: string; total: number; excellent: number; satisfactory: number; average: number };

const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function SurveyPage() {
  const { data: session, status } = useSession();
  const [surveys, setSurveys] = useState<Survey[]>(dummySurveys);
  const [isDummy, setIsDummy] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filters, setFilters] = useState({
    location: "",
    deviceId: "",
    answer: "",
    startDate: "",
    endDate: ""
  });
  const [pagination, setPagination] = useState({
    page: 1, limit: 10, total: 0, totalPages: 1, hasNext: false, hasPrev: false
  });
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [startTime, setStartTime] = useState<string>("00:00");
  const [endTime, setEndTime] = useState<string>("23:59");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [exportScope, setExportScope] = useState<'filtered' | 'all'>('filtered');
  const exportBtnRef = useRef<HTMLButtonElement>(null);
  const [timeShift, setTimeShift] = useState<string>("");
  const [dailyBreakdown, setDailyBreakdown] = useState<Breakdown[]>([]);
  const [locationBreakdown, setLocationBreakdown] = useState<LocationBreakdown[]>([]);
  const [responseDistribution, setResponseDistribution] = useState<{excellent: number, satisfactory: number, average: number}>({excellent: 0, satisfactory: 0, average: 0});
  const [surveyStats, setSurveyStats] = useState<SurveyStats | null>(null);
  const pieColors = ["#22c55e", "#eab308", "#ef4444"];

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.accessToken) return;
    const fetchData = async () => {
      try {
        const params: Record<string, string | number> = {
          page,
          limit,
          sortBy,
          sortOrder,
        };
        if (filters.location) params.location = filters.location;
        if (filters.answer) params.answer = filters.answer;
        if (dateRange?.from) {
          const start = new Date(dateRange.from);
          const [sh, sm] = startTime.split(":");
          start.setHours(Number(sh), Number(sm), 0, 0);
          params.startDate = start.toISOString();
        }
        if (dateRange?.to) {
          const end = new Date(dateRange.to);
          const [eh, em] = endTime.split(":");
          end.setHours(Number(eh), Number(em), 59, 999);
          params.endDate = end.toISOString();
        }
        const surveyRes = await apiClient.get("/surveys", {
          params,
          headers: {
            Authorization: `Bearer ${session.user.accessToken}`,
          },
        });
        let filtered = surveyRes.data.data || [];
        if (timeShift) {
          filtered = filtered.filter((s: Survey) => {
            const d = new Date(s.timestamp || s.createdAt);
            return isWithinTimeShift(d, timeShift);
          });
        }
        setSurveys(filtered);
        setPagination(surveyRes.data.meta?.pagination || pagination);
        setIsDummy(false);
        const uniqueLocations = Array.from(new Set((surveyRes.data.data || []).map((s: Survey) => s.location))) as string[];
        setLocationOptions(uniqueLocations);

        // Fetch survey stats
        const statsRes = await apiClient.get("/surveys/stats", {
          headers: {
            Authorization: `Bearer ${session.user.accessToken}`,
          },
        });
        setSurveyStats(statsRes.data.data);

        // Compute analytics from filtered surveys
        // Daily breakdown
        const dailyMap: Record<string, {date: string, total: number, excellent: number, satisfactory: number, average: number}> = {};
        filtered.forEach((s: Survey) => {
          const date = (s.timestamp || s.createdAt).slice(0, 10);
          if (!dailyMap[date]) dailyMap[date] = {date, total: 0, excellent: 0, satisfactory: 0, average: 0};
          dailyMap[date].total++;
          if (s.answer === 'EXCELLENT' || s.answer === 'Excellent') dailyMap[date].excellent++;
          else if (s.answer === 'SATISFACTORY' || s.answer === 'Satisfactory') dailyMap[date].satisfactory++;
          else if (s.answer === 'AVERAGE' || s.answer === 'Average') dailyMap[date].average++;
        });
        setDailyBreakdown(Object.values(dailyMap));

        // Location breakdown
        const locMap: Record<string, {location: string, total: number, excellent: number, satisfactory: number, average: number}> = {};
        filtered.forEach((s: Survey) => {
          const location = s.location || 'Unknown';
          if (!locMap[location]) locMap[location] = {location, total: 0, excellent: 0, satisfactory: 0, average: 0};
          locMap[location].total++;
          if (s.answer === 'EXCELLENT' || s.answer === 'Excellent') locMap[location].excellent++;
          else if (s.answer === 'SATISFACTORY' || s.answer === 'Satisfactory') locMap[location].satisfactory++;
          else if (s.answer === 'AVERAGE' || s.answer === 'Average') locMap[location].average++;
        });
        setLocationBreakdown(Object.values(locMap));

        // Response distribution
        let excellent = 0, satisfactory = 0, average = 0;
        filtered.forEach((s: Survey) => {
          if (s.answer === 'EXCELLENT' || s.answer === 'Excellent') excellent++;
          else if (s.answer === 'SATISFACTORY' || s.answer === 'Satisfactory') satisfactory++;
          else if (s.answer === 'AVERAGE' || s.answer === 'Average') average++;
        });
        setResponseDistribution({excellent, satisfactory, average});
      } catch (error) {
        console.error("Failed to fetch data:", error);
        let filtered = dummySurveys;
        if (timeShift) {
          filtered = filtered.filter((s: Survey) => {
            const d = new Date(s.timestamp || s.createdAt);
            return isWithinTimeShift(d, timeShift);
          });
        }
        setSurveys(filtered);
        setPagination({
          page: 1, limit: 10, total: dummySurveys.length, totalPages: 1, hasNext: false, hasPrev: false
        });
        setIsDummy(true);
        setLocationOptions([]);
        setDailyBreakdown([]);
        setLocationBreakdown([]);
        setResponseDistribution({excellent: 0, satisfactory: 0, average: 0});
        setSurveyStats(null);
      }
    };
    fetchData();
    // eslint-disable-next-line
  }, [status, session, page, limit, filters, sortBy, sortOrder, dateRange, startTime, endTime, timeShift]);

  useEffect(() => {
    if (dateRange) {
      setStartTime("00:00");
      setEndTime("23:59");
    }
  }, [dateRange]);

  useEffect(() => {
    if (timeShift === "morning") {
      setStartTime("05:00");
      setEndTime("11:59");
    } else if (timeShift === "day") {
      setStartTime("12:00");
      setEndTime("18:59");
    } else if (timeShift === "night") {
      setStartTime("19:00");
      setEndTime("04:59");
    } else {
      setStartTime("00:00");
      setEndTime("23:59");
    }
  }, [timeShift]);

  const handleSelectChange = (name: string, value: string) => {
    let val = value;
    if (name === "answer") val = val.toUpperCase();
    setFilters({ ...filters, [name]: val });
    setPage(1);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const clearFilter = useCallback((key: string) => {
    if (key === "dateRange") setDateRange(undefined);
    else if (key === "startTime") setStartTime("00:00");
    else if (key === "endTime") setEndTime("23:59");
    else setFilters((prev) => ({ ...prev, [key]: "" }));
  }, []);

  const getFilterChips = () => {
    const chips: {key: string, label: string}[] = [];
    if (dateRange?.from || dateRange?.to) {
      let label = "";
      if (dateRange?.from) label += dateRange.from.toLocaleDateString();
      if (dateRange?.to) label += ` - ${dateRange.to.toLocaleDateString()}`;
      chips.push({ key: "dateRange", label: `Date: ${label}` });
    }
    if (startTime !== "00:00") chips.push({ key: "startTime", label: `Start: ${startTime}` });
    if (endTime !== "23:59") chips.push({ key: "endTime", label: `End: ${endTime}` });
    if (filters.location) chips.push({ key: "location", label: `Location: ${filters.location}` });
    if (filters.answer) chips.push({ key: "answer", label: `Rating: ${filters.answer}` });
    return chips;
  };

  const setQuickRange = (type: 'today' | 'week' | 'month' | 'last7') => {
    const now = new Date();
    let from: Date;
    const to = new Date(now);
    switch (type) {
      case 'today':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        break;
      case 'month':
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'last7':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        break;
      default:
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
    setDateRange({ from, to });
  };

  const resetFilters = () => {
    setDateRange(undefined);
    setStartTime("00:00");
    setEndTime("23:59");
    setTimeShift("");
    setFilters({ location: "", deviceId: "", answer: "", startDate: "", endDate: "" });
    setPage(1);
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-xl font-bold">Survey Management</h2>
        <span className={`px-2 py-1 rounded text-xs font-semibold ${isDummy ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
          {isDummy ? "Dummy Data" : "Live from API"}
        </span>
      </div>

      {/* Survey Stats Cards */}r
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard title="Total Surveys" value={surveyStats?.total} icon={<BarChart3 className="text-blue-500" size={20} />} colors="from-blue-50 to-blue-100" textColor="text-blue-700" />
        <StatCard title="Excellent" value={surveyStats?.excellent} icon={<Star className="text-green-500" size={20} />} colors="from-green-50 to-green-100" textColor="text-green-700" />
        <StatCard title="Satisfactory" value={surveyStats?.satisfactory} icon={<ThumbsUp className="text-yellow-500" size={20} />} colors="from-yellow-50 to-yellow-100" textColor="text-yellow-700" />
        <StatCard title="Average" value={surveyStats?.average} icon={<ThumbsDown className="text-red-500" size={20} />} colors="from-red-50 to-red-100" textColor="text-red-700" />
      </div>
      
      <div className={cn("sticky top-0 z-10 bg-white border-b border-muted/30 mb-2", !filtersOpen && "shadow-sm")}
        style={{ transition: "box-shadow 0.2s" }}>
        <div className="flex items-center justify-between px-2 py-2">
          <span className="font-semibold text-base">Filters</span>
          <div className="flex items-center gap-2">
            {!filtersOpen && (
              <Button
                variant="outline"
                size="sm"
                className="md:hidden"
                onClick={() => setFiltersOpen(true)}
              >
                Show Filters
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setFiltersOpen((v) => !v)} aria-label="Toggle filters">
              <ChevronDownIcon className={cn("transition-transform", !filtersOpen && "rotate-180")}/>
            </Button>
            <Button variant="outline" size="sm" onClick={resetFilters} className="hidden md:inline-flex">Reset Filters</Button>
          </div>
        </div>
        <AnimatePresence initial={false}>
          {filtersOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="flex flex-col md:flex-row md:items-end gap-4 px-2 pb-2">
                <div className="flex flex-wrap gap-2 mb-2">
                  <Button size="sm" variant="outline" onClick={() => setQuickRange('today')}>Today</Button>
                  <Button size="sm" variant="outline" onClick={() => setQuickRange('week')}>This Week</Button>
                  <Button size="sm" variant="outline" onClick={() => setQuickRange('month')}>This Month</Button>
                  <Button size="sm" variant="outline" onClick={() => setQuickRange('last7')}>Last 7 Days</Button>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-xs font-medium text-muted-foreground mb-1">Date range</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-[220px] justify-start text-left font-normal">
                        {dateRange?.from
                          ? dateRange.to
                            ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
                            : dateRange.from.toLocaleDateString()
                          : "Pick a date range"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0">
                      <Calendar
                        mode="range"
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <Select value={timeShift} onValueChange={val => setTimeShift(val)}>
                  <SelectTrigger className="w-[180px] mt-2 md:mt-0">
                    <SelectValue placeholder="All Time Shifts" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeShifts.map(shift => (
                      <SelectItem key={shift.value} value={shift.value}>{shift.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <TimePicker
                  value={startTime}
                  onChange={setStartTime}
                  label="Start time"
                  id="start-time"
                  disabled={!!timeShift}
                />
                <TimePicker
                  value={endTime}
                  onChange={setEndTime}
                  label="End time"
                  id="end-time"
                  disabled={!!timeShift}
                />
                <Select value={filters.location} onValueChange={val => handleSelectChange('location', val)}>
                  <SelectTrigger className="w-[180px] mt-2 md:mt-0">
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    {locationOptions.map(location => (
                      <SelectItem key={location} value={location}>{location}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filters.answer} onValueChange={val => handleSelectChange('answer', val)}>
                  <SelectTrigger className="w-[180px] mt-2 md:mt-0">
                    <SelectValue placeholder="All Ratings" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXCELLENT">Excellent</SelectItem>
                    <SelectItem value="SATISFACTORY">Satisfactory</SelectItem>
                    <SelectItem value="AVERAGE">Average</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex flex-wrap gap-3 px-2 py-2 border-t border-muted/20 bg-white md:gap-2">
          {getFilterChips().length === 0 ? (
            <span className="text-xs text-muted-foreground">No filters applied</span>
          ) : (
            getFilterChips().map(chip => (
              <span
                key={chip.key}
                className="flex items-center gap-1 bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-medium shadow-sm mb-2 md:mb-0"
              >
                {chip.label}
                <button
                  className="ml-1 p-0.5 rounded-full hover:bg-primary/20 focus:bg-primary/20 focus:outline-none transition-colors"
                  onClick={() => clearFilter(chip.key)}
                  aria-label={`Remove ${chip.label}`}
                  tabIndex={0}
                >
                  <XIcon className="size-3.5" />
                </button>
              </span>
            ))
          )}
        </div>
        <div className="md:hidden flex justify-end mb-2">
          <Button variant="outline" size="sm" onClick={resetFilters}>Reset Filters</Button>
        </div>
      </div>
      <div className="flex justify-end items-center mb-2">
        <Button ref={exportBtnRef} onClick={() => setExportModalOpen(true)} variant="outline" className="ml-auto">Export</Button>
      </div>
      {exportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-xs">
            <h2 className="font-semibold text-lg mb-4">Export Surveys</h2>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Format</label>
              <select value={exportFormat} onChange={e => setExportFormat(e.target.value as 'csv' | 'json')} className="w-full border rounded px-2 py-1">
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
              </select>
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">Scope</label>
              <select value={exportScope} onChange={e => setExportScope(e.target.value as 'filtered' | 'all')} className="w-full border rounded px-2 py-1">
                <option value="filtered">Current Filters</option>
                <option value="all">All Data</option>
              </select>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => setExportModalOpen(false)} className="flex-1">Cancel</Button>
              <Button variant="default" className="flex-1" onClick={async () => {
                // Build export URL for direct backend call
                let url = `${BACKEND_API_URL}/surveys/export?format=${exportFormat}`;
                if (exportScope === 'filtered') {
                  if (filters.location) url += `&location=${encodeURIComponent(filters.location)}`;
                  if (filters.answer) url += `&answer=${encodeURIComponent(filters.answer)}`;
                  if (dateRange?.from) url += `&startDate=${encodeURIComponent(dateRange.from.toISOString())}`;
                  if (dateRange?.to) url += `&endDate=${encodeURIComponent(dateRange.to.toISOString())}`;
                  if (startTime !== "00:00" && dateRange?.from) {
                    const d = new Date(dateRange.from);
                    const [h, m] = startTime.split(":");
                    d.setHours(Number(h), Number(m), 0, 0);
                    url = url.replace(`startDate=${encodeURIComponent(dateRange.from.toISOString())}`, `startDate=${encodeURIComponent(d.toISOString())}`);
                  }
                  if (endTime !== "23:59" && dateRange?.to) {
                    const d = new Date(dateRange.to);
                    const [h, m] = endTime.split(":");
                    d.setHours(Number(h), Number(m), 59, 999);
                    url = url.replace(`endDate=${encodeURIComponent(dateRange.to.toISOString())}`, `endDate=${encodeURIComponent(d.toISOString())}`);
                  }
                }
                window.open(url, '_blank');
                setExportModalOpen(false);
              }}>Export</Button>
            </div>
          </div>
        </div>
      )}
      <div className="overflow-x-auto mb-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer" onClick={() => handleSort("id")}>ID {sortBy === "id" && (sortOrder === "asc" ? "▲" : "▼")}</TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("timestamp")}>Date {sortBy === "timestamp" && (sortOrder === "asc" ? "▲" : "▼")}</TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("location")}>Location {sortBy === "location" && (sortOrder === "asc" ? "▲" : "▼")}</TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("deviceId")}>Device {sortBy === "deviceId" && (sortOrder === "asc" ? "▲" : "▼")}</TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("timestamp")}>Time {sortBy === "timestamp" && (sortOrder === "asc" ? "▲" : "▼")}</TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("answer")}>Rating {sortBy === "answer" && (sortOrder === "asc" ? "▲" : "▼")}</TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("syncStatus")}>Synced {sortBy === "syncStatus" && (sortOrder === "asc" ? "▲" : "▼")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {surveys.map((survey) => (
              <TableRow key={survey.id}>
                <TableCell>{survey.id}</TableCell>
                <TableCell>{survey.timestamp ? survey.timestamp.slice(0, 10) : ''}</TableCell>
                <TableCell>{survey.location}</TableCell>
                <TableCell>{survey.device?.name || survey.deviceId}</TableCell>
                <TableCell>{survey.timestamp ? new Date(survey.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (survey.createdAt ? new Date(survey.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')}</TableCell>
                <TableCell>{survey.answer ? survey.answer.charAt(0) + survey.answer.slice(1).toLowerCase() : ''}</TableCell>
                <TableCell>{survey.syncStatus === 'SYNCED' ? 'Yes' : 'No'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mt-4">
        <div className="flex gap-1 items-center">
          <button
            className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-2 focus:ring-primary disabled:opacity-50 transition"
            disabled={pagination.page === 1}
            onClick={() => setPage(1)}
            aria-label="First page"
          >«</button>
          <button
            className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-2 focus:ring-primary disabled:opacity-50 transition"
            disabled={!pagination.hasPrev}
            onClick={() => setPage(page - 1)}
            aria-label="Previous page"
          >‹</button>
          <span className="mx-2 text-sm font-medium">Page {pagination.page} of {pagination.totalPages}</span>
          <button
            className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-2 focus:ring-primary disabled:opacity-50 transition"
            disabled={!pagination.hasNext}
            onClick={() => setPage(page + 1)}
            aria-label="Next page"
          >›</button>
          <button
            className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-2 focus:ring-primary disabled:opacity-50 transition"
            disabled={pagination.page === pagination.totalPages}
            onClick={() => setPage(pagination.totalPages)}
            aria-label="Last page"
          >»</button>
        </div>
        <div className="flex gap-2 items-center justify-end">
          <span className="text-sm">Rows per page:</span>
          <select
            className="border px-2 py-1 rounded text-sm focus:ring-2 focus:ring-primary"
            value={limit}
            onChange={e => { setLimit(Number(e.target.value)); setPage(1); }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Survey Ratings Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyBreakdown.length > 0 ? dailyBreakdown : dummyStats.dailyBreakdown}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="excellent" fill="rgba(34,197,94,0.7)" name="Excellent" />
                  <Bar dataKey="satisfactory" fill="rgba(234,179,8,0.7)" name="Satisfactory" />
                  <Bar dataKey="average" fill="rgba(239,68,68,0.7)" name="Average" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Survey Ratings by Location</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locationBreakdown.length > 0 ? locationBreakdown : dummyStats.locationBreakdown}>
                  <XAxis dataKey="location" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="excellent" fill="rgba(34,197,94,0.7)" name="Excellent" />
                  <Bar dataKey="satisfactory" fill="rgba(234,179,8,0.7)" name="Satisfactory" />
                  <Bar dataKey="average" fill="rgba(239,68,68,0.7)" name="Average" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Survey Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={responseDistribution.excellent + responseDistribution.satisfactory + responseDistribution.average > 0 ? [
                      { type: "Excellent", value: responseDistribution.excellent },
                      { type: "Satisfactory", value: responseDistribution.satisfactory },
                      { type: "Average", value: responseDistribution.average },
                    ] : dummyAnalytics}
                    dataKey="value"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {(responseDistribution.excellent + responseDistribution.satisfactory + responseDistribution.average > 0 ? [
                      { type: "Excellent", value: responseDistribution.excellent },
                      { type: "Satisfactory", value: responseDistribution.satisfactory },
                      { type: "Average", value: responseDistribution.average },
                    ] : dummyAnalytics).map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={pieColors[idx % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}