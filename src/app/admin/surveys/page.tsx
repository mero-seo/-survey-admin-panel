"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
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
import { StatCard } from "@/components/StatCard";
import { PaginationControls } from "@/components/PaginationControls";

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

interface PaginationMeta {
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

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

type Breakdown = { date: string; total: number; excellent: number; satisfactory: number; average: number };
type LocationBreakdown = { location: string; total: number; excellent: number; satisfactory: number; average: number };

export default function SurveyPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL-based state
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") || "desc";
  const locationFilter = searchParams.get("location") || "";
  const answerFilter = searchParams.get("answer") || "";
  const timeShift = searchParams.get("timeShift") || "";

  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");

  const dateRange: DateRange | undefined = useMemo(() => {
    if (startDateParam && endDateParam) {
      return { from: new Date(startDateParam), to: new Date(endDateParam) };
    }
    return undefined;
  }, [startDateParam, endDateParam]);

  // Component state
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [isDummy, setIsDummy] = useState(true);
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>({ total: 0, totalPages: 1, hasNext: false, hasPrev: false });
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [exportScope, setExportScope] = useState<'filtered' | 'all'>('filtered');
  const [dailyBreakdown, setDailyBreakdown] = useState<Breakdown[]>([]);
  const [locationBreakdown, setLocationBreakdown] = useState<LocationBreakdown[]>([]);
  const [responseDistribution, setResponseDistribution] = useState<{excellent: number, satisfactory: number, average: number}>({excellent: 0, satisfactory: 0, average: 0});
  const [surveyStats, setSurveyStats] = useState<SurveyStats | null>(null);
  const pieColors = ["#22c55e", "#eab308", "#ef4444"];

  const updateSearchParams = useCallback((paramsToUpdate: Record<string, string | number | null | Date>) => {
    const newParams = new URLSearchParams(searchParams.toString());
    Object.entries(paramsToUpdate).forEach(([key, value]) => {
      if (value === null || value === '') {
        newParams.delete(key);
      } else if (value instanceof Date) {
        newParams.set(key, value.toISOString().split('T')[0]);
      } 
      else {
        newParams.set(key, String(value));
      }
    });
    router.push(`${pathname}?${newParams.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  useEffect(() => {
    if (sessionStatus !== "authenticated" || !session?.user?.accessToken) return;

    const fetchData = async () => {
      try {
        const params: Record<string, string | number> = {
          page,
          limit,
          sortBy,
          sortOrder,
        };
        if (locationFilter) params.location = locationFilter;
        if (answerFilter) params.answer = answerFilter;
        if (dateRange?.from) params.startDate = dateRange.from.toISOString();
        if (dateRange?.to) {
          const endOfDay = new Date(dateRange.to);
          endOfDay.setHours(23, 59, 59, 999);
          params.endDate = endOfDay.toISOString();
        }

        const surveyRes = await apiClient.get("/surveys", {
          params,
          headers: { Authorization: `Bearer ${session.user.accessToken}` },
        });

        let filtered = surveyRes.data.data || [];
        if (timeShift) {
          filtered = filtered.filter((s: Survey) => isWithinTimeShift(new Date(s.timestamp || s.createdAt), timeShift));
        }

        setSurveys(filtered);
        setPaginationMeta(surveyRes.data.meta?.pagination || { total: 0, totalPages: 1, hasNext: false, hasPrev: false });
        setIsDummy(false);
        const uniqueLocations = Array.from(new Set((surveyRes.data.data || []).map((s: Survey) => s.location))) as string[];
        setLocationOptions(uniqueLocations);

        const statsRes = await apiClient.get("/surveys/stats", { headers: { Authorization: `Bearer ${session.user.accessToken}` } });
        setSurveyStats(statsRes.data.data);

        // Compute analytics from filtered surveys
        const dailyMap: Record<string, Breakdown> = {};
        filtered.forEach((s: Survey) => {
          const date = (s.timestamp || s.createdAt).slice(0, 10);
          if (!dailyMap[date]) dailyMap[date] = {date, total: 0, excellent: 0, satisfactory: 0, average: 0};
          dailyMap[date].total++;
          if (s.answer === 'EXCELLENT' || s.answer === 'Excellent') dailyMap[date].excellent++;
          else if (s.answer === 'SATISFACTORY' || s.answer === 'Satisfactory') dailyMap[date].satisfactory++;
          else if (s.answer === 'AVERAGE' || s.answer === 'Average') dailyMap[date].average++;
        });
        setDailyBreakdown(Object.values(dailyMap));

        const locMap: Record<string, LocationBreakdown> = {};
        filtered.forEach((s: Survey) => {
          const location = s.location || 'Unknown';
          if (!locMap[location]) locMap[location] = {location, total: 0, excellent: 0, satisfactory: 0, average: 0};
          locMap[location].total++;
          if (s.answer === 'EXCELLENT' || s.answer === 'Excellent') locMap[location].excellent++;
          else if (s.answer === 'SATISFACTORY' || s.answer === 'Satisfactory') locMap[location].satisfactory++;
          else if (s.answer === 'AVERAGE' || s.answer === 'Average') locMap[location].average++;
        });
        setLocationBreakdown(Object.values(locMap));

        let excellent = 0, satisfactory = 0, average = 0;
        filtered.forEach((s: Survey) => {
          if (s.answer === 'EXCELLENT' || s.answer === 'Excellent') excellent++;
          else if (s.answer === 'SATISFACTORY' || s.answer === 'Satisfactory') satisfactory++;
          else if (s.answer === 'AVERAGE' || s.answer === 'Average') average++;
        });
        setResponseDistribution({excellent, satisfactory, average});

      } catch (error) {
        console.error("Failed to fetch data:", error);
        setSurveys([]);
        setPaginationMeta({ total: 0, totalPages: 1, hasNext: false, hasPrev: false });
        setIsDummy(true);
        setLocationOptions([]);
        setDailyBreakdown([]);
        setLocationBreakdown([]);
        setResponseDistribution({excellent: 0, satisfactory: 0, average: 0});
        setSurveyStats(null);
      }
    };
    fetchData();
  }, [sessionStatus, session, page, limit, sortBy, sortOrder, locationFilter, answerFilter, dateRange, timeShift]);

  const handleExport = () => {
    let url = `/api/v1/surveys/export?format=${exportFormat}`;
    if (exportScope === 'filtered') {
        const filteredParams = new URLSearchParams(searchParams.toString());
        filteredParams.delete('page');
        filteredParams.delete('limit');
        url += `&${filteredParams.toString()}`;
    }
    window.open(url, '_blank');
    setExportModalOpen(false);
  };

  const handleSort = (column: string) => {
    const newSortOrder = sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc';
    updateSearchParams({ sortBy: column, sortOrder: newSortOrder, page: 1 });
  };
  
  const handlePageChange = (newPage: number) => {
    updateSearchParams({ page: newPage });
  };
  
  const handleLimitChange = (newLimit: number) => {
    updateSearchParams({ limit: newLimit, page: 1 });
  };

  const handleFilterChange = (key: 'location' | 'answer' | 'timeShift', value: string) => {
    updateSearchParams({ [key]: value, page: 1 });
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    updateSearchParams({ 
      startDate: range?.from || null, 
      endDate: range?.to || null,
      page: 1
    });
  };

  const clearFilter = useCallback((key: string) => {
    if (key === "dateRange") {
      updateSearchParams({ startDate: null, endDate: null, page: 1 });
    } else {
      updateSearchParams({ [key]: null, page: 1 });
    }
  }, [updateSearchParams]);

  const getFilterChips = () => {
    const chips: {key: string, label: string}[] = [];
    if (dateRange?.from || dateRange?.to) {
      let label = "";
      if (dateRange?.from) label += dateRange.from.toLocaleDateString();
      if (dateRange?.to) label += ` - ${dateRange.to.toLocaleDateString()}`;
      chips.push({ key: "dateRange", label: `Date: ${label}` });
    }
    if (locationFilter) chips.push({ key: "location", label: `Location: ${locationFilter}` });
    if (answerFilter) chips.push({ key: "answer", label: `Rating: ${answerFilter}` });
    if (timeShift) {
        const shift = timeShifts.find(ts => ts.value === timeShift);
        if(shift) chips.push({key: "timeShift", label: `Shift: ${shift.label}`})
    }
    return chips;
  };

  const setQuickRange = (type: 'today' | 'week' | 'month' | 'last7') => {
    const now = new Date();
    let from: Date;
    const to = new Date(now);
    switch (type) {
      case 'today': from = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
      case 'week': from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()); break;
      case 'month': from = new Date(now.getFullYear(), now.getMonth(), 1); break;
      case 'last7': from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6); break;
      default: from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
    handleDateRangeChange({ from, to });
  };

  const resetFilters = () => {
    updateSearchParams({
      startDate: null,
      endDate: null,
      location: null,
      answer: null,
      timeShift: null,
      page: 1,
    });
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-xl font-bold">Survey Management</h2>
        <span className={`px-2 py-1 rounded text-xs font-semibold ${isDummy ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
          {isDummy ? "Dummy Data" : "Live from API"}
        </span>
      </div>

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
                        {dateRange?.from ? (dateRange.to ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}` : dateRange.from.toLocaleDateString()) : "Pick a date range"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0">
                      <Calendar mode="range" selected={dateRange} onSelect={handleDateRangeChange} numberOfMonths={2} />
                    </PopoverContent>
                  </Popover>
                </div>
                <Select value={timeShift} onValueChange={val => handleFilterChange('timeShift', val)}>
                  <SelectTrigger className="w-[180px] mt-2 md:mt-0">
                    <SelectValue placeholder="All Time Shifts" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeShifts.map(shift => <SelectItem key={shift.value} value={shift.value}>{shift.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={locationFilter} onValueChange={val => handleFilterChange('location', val)}>
                  <SelectTrigger className="w-[180px] mt-2 md:mt-0">
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    {locationOptions.map(location => <SelectItem key={location} value={location}>{location}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={answerFilter} onValueChange={val => handleFilterChange('answer', val)}>
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
        <Button onClick={() => setExportModalOpen(true)} variant="outline" className="ml-auto">Export</Button>
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
              <Button variant="default" className="flex-1" onClick={handleExport}>Export</Button>
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
      <PaginationControls
          page={page}
          limit={limit}
          totalPages={paginationMeta.totalPages}
          hasNext={paginationMeta.hasNext}
          hasPrev={paginationMeta.hasPrev}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Survey Ratings Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyBreakdown.length > 0 ? dailyBreakdown : []}>
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
                <BarChart data={locationBreakdown.length > 0 ? locationBreakdown : []}>
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