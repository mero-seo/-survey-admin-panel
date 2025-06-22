"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { useSession } from "next-auth/react";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import {
  ChevronDownIcon,
  XIcon,
  BarChart3,
  Star,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { StatCard } from "@/components/StatCard";
import { PaginationControls } from "@/components/PaginationControls";
import { DynamicTable, ColumnDef } from "@/components/DynamicTable";
import { StatCardSkeleton } from "@/components/StatCardSkeleton";
import { TableSkeleton } from "@/components/TableSkeleton";
import { ChartSkeleton } from "@/components/ChartSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

interface SurveyStats {
  total: number;
  excellent: number;
  satisfactory: number;
  average: number;
}

interface Survey {
  id: string;
  deviceInfo: {
    model: string;
    os: string;
    version: string;
    appVersion: string;
  };
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

type SortOrder = "asc" | "desc";

const timeShifts = [
  {
    label: "Morning (5:00AM–11:59AM)",
    value: "morning",
    start: "05:00",
    end: "11:59",
  },
  { label: "Day (12:00PM–6:59PM)", value: "day", start: "12:00", end: "18:59" },
  {
    label: "Night (7:00PM–4:59AM)",
    value: "night",
    start: "19:00",
    end: "04:59",
  },
];

const quickSelectOptions = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "Last 7 Days", value: "last7" },
];

// Utility function to convert UTC time to Nepal time
const convertToNepalTime = (utcDate: Date): Date => {
  // Nepal is UTC+5:45
  return new Date(utcDate.getTime() + (5 * 60 + 45) * 60 * 1000);
};

// Utility function to format Nepal time
const formatNepalTime = (dateString: string): string => {
  const utcDate = new Date(dateString);
  const nepalDate = convertToNepalTime(utcDate);
  return nepalDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kathmandu",
  });
};

export default function SurveyPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL-based state
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = (searchParams.get("sortOrder") as SortOrder) || "desc";
  const locationFilter = searchParams.get("location") || "";
  const answerFilter = searchParams.get("answer") || "";
  const timeShift = searchParams.get("timeShift") || "";
  const deviceNameFilter = searchParams.get("deviceName") || "";

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
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>({
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");
  const [exportScope, setExportScope] = useState<"filtered" | "all">(
    "filtered"
  );
  const [surveyStats, setSurveyStats] = useState<SurveyStats | null>(null);

  const [activeFilters, setActiveFilters] = useState({
    dateRange: {
      from: startDateParam ? new Date(startDateParam) : undefined,
      to: endDateParam ? new Date(endDateParam) : undefined,
    },
    timeShift: timeShift || "",
    location: locationFilter || "",
    answer: answerFilter || "",
    deviceName: deviceNameFilter || "",
  });

  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [isStatsLoading, setIsStatsLoading] = useState(false);

  const updateSearchParams = useCallback(
    (paramsToUpdate: Record<string, string | number | null | Date>) => {
      const newParams = new URLSearchParams(searchParams.toString());
      Object.entries(paramsToUpdate).forEach(([key, value]) => {
        if (value === null || value === "" || value === undefined) {
          newParams.delete(key);
        } else if (value instanceof Date) {
          newParams.set(key, value.toISOString().split("T")[0]);
        } else {
          newParams.set(key, String(value));
        }
      });
      router.push(`${pathname}?${newParams.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  const fetchData = useCallback(async () => {
    // Only show full loading on initial load
    if (surveys.length === 0) {
      setIsDataLoading(true);
    } else {
      setIsTableLoading(true);
      setIsStatsLoading(true);
    }

    if (!session?.user?.accessToken) return;

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
      if (timeShift) params.timeShift = timeShift;
      if (deviceNameFilter) params.deviceName = deviceNameFilter;

      // Fetch surveys and stats in parallel
      const [surveyRes, statsRes] = await Promise.all([
        apiClient.get("/surveys", {
          params,
          headers: { Authorization: `Bearer ${session.user.accessToken}` },
        }),
        apiClient.get("/surveys/stats", {
          params,
          headers: { Authorization: `Bearer ${session.user.accessToken}` },
        }),
      ]);

      const surveysData = surveyRes.data.data || [];
      setSurveys(surveysData);
      setPaginationMeta(
        surveyRes.data.meta?.pagination || {
          total: 0,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        }
      );
      const uniqueLocations = Array.from(
        new Set(surveysData.map((s: Survey) => s.location))
      ) as string[];
      setLocationOptions(uniqueLocations);
      setSurveyStats(statsRes.data.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setSurveys([]);
      setPaginationMeta({
        total: 0,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });
      setLocationOptions([]);
      setSurveyStats(null);
    } finally {
      setIsDataLoading(false);
      setIsTableLoading(false);
      setIsStatsLoading(false);
    }
  }, [
    answerFilter,
    dateRange,
    deviceNameFilter,
    limit,
    locationFilter,
    page,
    session,
    sortBy,
    sortOrder,
    surveys.length,
    timeShift,
  ]);

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchData();
    }
  }, [sessionStatus, fetchData]);

  // Fetch filter options
  useEffect(() => {
    if (sessionStatus !== "authenticated" || !session?.user?.accessToken)
      return;

    const fetchFilterOptions = async () => {
      try {
        const params: Record<string, string> = {};
        if (dateRange?.from) params.startDate = dateRange.from.toISOString();
        if (dateRange?.to) {
          const endOfDay = new Date(dateRange.to);
          endOfDay.setHours(23, 59, 59, 999);
          params.endDate = endOfDay.toISOString();
        }
        if (timeShift) params.timeShift = timeShift;
        if (deviceNameFilter) params.deviceName = deviceNameFilter;

        const response = await apiClient.get("/surveys/filter-options", {
          params,
          headers: { Authorization: `Bearer ${session.user.accessToken}` },
        });

        const { locations } = response.data.data;
        setLocationOptions(locations || []);
      } catch (error) {
        console.error("Failed to fetch filter options:", error);
      }
    };

    fetchFilterOptions();
  }, [sessionStatus, session, dateRange, deviceNameFilter]);

  const handleExport = async () => {
    if (!session?.user?.accessToken) {
      console.error("Authentication token not found.");
      return;
    }

    setExportModalOpen(false);

    try {
      const params = new URLSearchParams();
      params.set("format", exportFormat);

      if (exportScope === "filtered") {
        const filteredParams = new URLSearchParams(searchParams.toString());
        filteredParams.delete("page");
        filteredParams.delete("limit");
        filteredParams.forEach((value, key) => {
          if (value) {
            params.set(key, value);
          }
        });
      }

      const response = await apiClient.get("/surveys/export", {
        params,
        headers: {
          Authorization: `Bearer ${session.user.accessToken}`,
        },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;

      let filename = `survey-export.${exportFormat}`;
      const contentDisposition = response.headers["content-disposition"];
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+?)"/);
        if (filenameMatch && filenameMatch.length > 1) {
          filename = filenameMatch[1];
        }
      }

      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();

      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed", error);
      // You can add a toast notification here to inform the user
    }
  };

  const handleSort = (column: string) => {
    const newSortOrder =
      sortBy === column && sortOrder === "asc" ? "desc" : "asc";
    updateSearchParams({ sortBy: column, sortOrder: newSortOrder, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    updateSearchParams({ page: newPage === 1 ? null : newPage });
  };

  const handleLimitChange = (newLimit: number) => {
    updateSearchParams({ limit: newLimit, page: 1 });
  };

  const handleApplyFilters = () => {
    updateSearchParams({
      startDate: activeFilters.dateRange.from || null,
      endDate: activeFilters.dateRange.to || null,
      timeShift: activeFilters.timeShift,
      location: activeFilters.location,
      answer: activeFilters.answer,
      deviceName: activeFilters.deviceName,
      page: 1,
    });
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setActiveFilters((prev) => ({
      ...prev,
      dateRange: { from: range?.from, to: range?.to },
    }));
  };

  const clearFilter = useCallback(
    (key: string) => {
      if (key === "dateRange") {
        updateSearchParams({ startDate: null, endDate: null, page: 1 });
      } else {
        updateSearchParams({ [key]: null, page: 1 });
      }
    },
    [updateSearchParams]
  );

  const getFilterChips = () => {
    const chips: { key: string; label: string }[] = [];
    if (dateRange?.from || dateRange?.to) {
      let label = "";
      if (dateRange?.from) label += dateRange.from.toLocaleDateString();
      if (dateRange?.to) label += ` - ${dateRange.to.toLocaleDateString()}`;
      chips.push({ key: "dateRange", label: `Date: ${label}` });
    }
    if (locationFilter)
      chips.push({ key: "location", label: `Location: ${locationFilter}` });
    if (answerFilter)
      chips.push({ key: "answer", label: `Rating: ${answerFilter}` });
    if (timeShift) {
      const shift = timeShifts.find((ts) => ts.value === timeShift);
      if (shift)
        chips.push({ key: "timeShift", label: `Shift: ${shift.label}` });
    }
    if (deviceNameFilter)
      chips.push({ key: "deviceName", label: `Device: ${deviceNameFilter}` });
    return chips;
  };

  const setQuickRange = (type: string) => {
    const now = new Date();
    let from: Date | undefined;
    let to: Date | undefined = new Date(now);

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
        break;
      default:
        from = undefined;
        to = undefined;
    }
    setActiveFilters((prev) => ({
      ...prev,
      dateRange: { from, to },
    }));
  };

  const resetFilters = () => {
    setActiveFilters({
      dateRange: { from: undefined, to: undefined },
      timeShift: "",
      location: "",
      answer: "",
      deviceName: "",
    });
    updateSearchParams({
      startDate: null,
      endDate: null,
      location: null,
      answer: null,
      timeShift: null,
      deviceName: null,
      page: 1,
    });
  };

  const columns: ColumnDef<Survey>[] = [
    {
      id: "id",
      header: "ID",
      cell: (survey) => survey.id.slice(-6),
      enableSorting: true,
    },
    {
      id: "timestamp",
      header: "Date",
      cell: (survey) => {
        if (survey.timestamp) {
          const utcDate = new Date(survey.timestamp);
          const nepalDate = convertToNepalTime(utcDate);
          return nepalDate.toLocaleDateString("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            timeZone: "Asia/Kathmandu",
          });
        }
        return "";
      },
      enableSorting: true,
    },
    {
      id: "location",
      header: "Location",
      cell: (survey) => survey.location,
      enableSorting: true,
    },
    {
      id: "deviceId",
      header: "Device",
      cell: (survey) => survey.device?.name || survey.deviceId,
      enableSorting: true,
    },
    {
      id: "timestamp_time",
      header: "Time",
      cell: (survey) =>
        survey.timestamp
          ? formatNepalTime(survey.timestamp)
          : survey.createdAt
          ? formatNepalTime(survey.createdAt)
          : "",
    },
    {
      id: "answer",
      header: "Rating",
      cell: (survey) =>
        survey.answer
          ? survey.answer.charAt(0) + survey.answer.slice(1).toLowerCase()
          : "",
      enableSorting: true,
    },
    {
      id: "syncStatus",
      header: "Synced",
      cell: (survey) => (survey.syncStatus === "SYNCED" ? "Yes" : "No"),
      enableSorting: true,
    },
  ];

  if (isDataLoading) {
    return (
      <div className="p-4 md:p-8">
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="h-7 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>

        {/* Filter Skeleton */}
        <div className="border-b border-muted/30 mb-2">
          <div className="flex items-center justify-between px-2 py-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-8 w-8" />
          </div>
          <div className="flex flex-col md:flex-row md:items-end gap-4 px-2 pb-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        <div className="rounded-md border mb-6">
          <TableSkeleton columns={7} rows={10} />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <ChartSkeleton />
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-xl font-bold">Survey Management</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {isStatsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              title="Total Surveys"
              value={surveyStats?.total}
              icon={<BarChart3 className="text-blue-500" size={20} />}
              colors="from-blue-50 to-blue-100"
              textColor="text-blue-700"
            />
            <StatCard
              title="Excellent"
              value={surveyStats?.excellent}
              icon={<Star className="text-green-500" size={20} />}
              colors="from-green-50 to-green-100"
              textColor="text-green-700"
            />
            <StatCard
              title="Satisfactory"
              value={surveyStats?.satisfactory}
              icon={<ThumbsUp className="text-yellow-500" size={20} />}
              colors="from-yellow-50 to-yellow-100"
              textColor="text-yellow-700"
            />
            <StatCard
              title="Average"
              value={surveyStats?.average}
              icon={<ThumbsDown className="text-red-500" size={20} />}
              colors="from-red-50 to-red-100"
              textColor="text-red-700"
            />
          </>
        )}
      </div>

      {/* Filters Section */}
      <div className="bg-card rounded-lg border mb-6">
        <div
          className="flex items-center justify-between p-4 cursor-pointer"
          onClick={() => setFiltersOpen(!filtersOpen)}
        >
          <h2 className="text-lg font-semibold">Filters</h2>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                resetFilters();
              }}
            >
              Reset Filters
            </Button>
            <ChevronDownIcon
              className={cn(
                "w-5 h-5 text-muted-foreground transition-transform duration-300",
                filtersOpen && "rotate-180"
              )}
            />
          </div>
        </div>
        <AnimatePresence>
          {filtersOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="p-4 border-t">
                <div className="flex flex-wrap items-end gap-4">
                  {/* Quick Select */}
                  <div className="flex-grow min-w-[150px]">
                    <label className="block text-sm font-medium text-muted-foreground mb-1">
                      Quick Select
                    </label>
                    <Select onValueChange={setQuickRange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a range..." />
                      </SelectTrigger>
                      <SelectContent>
                        {quickSelectOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date Range Picker */}
                  <div className="flex-grow min-w-[200px]">
                    <label
                      htmlFor="date-range"
                      className="block text-sm font-medium text-muted-foreground mb-1"
                    >
                      Date range
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="date-range"
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <span>
                            {activeFilters.dateRange?.from ? (
                              activeFilters.dateRange.to ? (
                                <>
                                  {activeFilters.dateRange.from.toLocaleDateString()}{" "}
                                  -{" "}
                                  {activeFilters.dateRange.to.toLocaleDateString()}
                                </>
                              ) : (
                                activeFilters.dateRange.from.toLocaleDateString()
                              )
                            ) : (
                              "Pick a date range"
                            )}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="range"
                          selected={activeFilters.dateRange}
                          onSelect={handleDateRangeChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  {/* Time Shift */}
                  <div className="flex-grow min-w-[150px]">
                    <label
                      htmlFor="time-shift"
                      className="block text-sm font-medium text-muted-foreground mb-1"
                    >
                      Time Shift
                    </label>
                    <Select
                      value={activeFilters.timeShift}
                      onValueChange={(value) =>
                        setActiveFilters((p) => ({ ...p, timeShift: value }))
                      }
                    >
                      <SelectTrigger id="time-shift">
                        <SelectValue placeholder="All Time Shifts" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeShifts.map((shift) => (
                          <SelectItem key={shift.value} value={shift.value}>
                            {shift.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Location */}
                  <div className="flex-grow min-w-[150px]">
                    <label
                      htmlFor="location"
                      className="block text-sm font-medium text-muted-foreground mb-1"
                    >
                      Location
                    </label>
                    <Select
                      value={activeFilters.location}
                      onValueChange={(value) =>
                        setActiveFilters((p) => ({ ...p, location: value }))
                      }
                    >
                      <SelectTrigger id="location">
                        <SelectValue placeholder="All Locations" />
                      </SelectTrigger>
                      <SelectContent>
                        {locationOptions.map((loc) => (
                          <SelectItem key={loc} value={loc}>
                            {loc}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Rating */}
                  <div className="flex-grow min-w-[150px]">
                    <label
                      htmlFor="rating"
                      className="block text-sm font-medium text-muted-foreground mb-1"
                    >
                      Rating
                    </label>
                    <Select
                      value={activeFilters.answer}
                      onValueChange={(value) =>
                        setActiveFilters((p) => ({ ...p, answer: value }))
                      }
                    >
                      <SelectTrigger id="rating">
                        <SelectValue placeholder="All Ratings" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EXCELLENT">Excellent</SelectItem>
                        <SelectItem value="SATISFACTORY">
                          Satisfactory
                        </SelectItem>
                        <SelectItem value="AVERAGE">Average</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Action Buttons */}
                  <div className="flex items-end gap-2">
                    <Button onClick={handleApplyFilters}>Apply Filters</Button>
                    <Button variant="ghost" onClick={resetFilters}>
                      Reset
                    </Button>
                  </div>
                </div>

                {/* Filter Actions */}
                <div className="mt-6 pt-4 border-t">
                  <span className="text-sm font-medium">Active Filters:</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {getFilterChips().length > 0 ? (
                      getFilterChips().map((chip) => (
                        <span
                          key={chip.key}
                          className="flex items-center gap-1 text-xs bg-muted text-muted-foreground rounded-full px-2 py-1"
                        >
                          {chip.label}
                          <button
                            onClick={() => clearFilter(chip.key)}
                            className="rounded-full hover:bg-background"
                          >
                            <XIcon className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        No active filters.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-card p-4 rounded-lg border">
        <div className="flex justify-end mb-4">
          <Button onClick={() => setExportModalOpen(true)}>Export</Button>
        </div>
        {exportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-xs">
              <h2 className="font-semibold text-lg mb-4">Export Surveys</h2>
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Format</label>
                <select
                  value={exportFormat}
                  onChange={(e) =>
                    setExportFormat(e.target.value as "csv" | "json")
                  }
                  className="w-full border rounded px-2 py-1"
                >
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Scope</label>
                <select
                  value={exportScope}
                  onChange={(e) =>
                    setExportScope(e.target.value as "filtered" | "all")
                  }
                  className="w-full border rounded px-2 py-1"
                >
                  <option value="filtered">Current Filters</option>
                  <option value="all">All Data</option>
                </select>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setExportModalOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={handleExport}
                >
                  Export
                </Button>
              </div>
            </div>
          </div>
        )}
        <div className="rounded-md border mb-6 px-5">
          <DynamicTable
            columns={columns}
            data={surveys}
            isLoading={isTableLoading}
            onSort={handleSort}
            sortBy={sortBy}
            sortOrder={sortOrder}
            emptyStateMessage="No surveys found for the selected filters."
          />
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
      </div>
    </div>
  );
}
