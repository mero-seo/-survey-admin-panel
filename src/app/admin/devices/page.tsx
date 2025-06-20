"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  PencilIcon,
  Trash2Icon,
  SettingsIcon,
  PowerIcon,
  PowerOffIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import { StatCard } from "@/components/StatCard";
import { PaginationControls } from "@/components/PaginationControls";
import { DynamicTable, ColumnDef } from "@/components/DynamicTable";

interface DeviceConfiguration {
  surveyInterval: number;
  theme: string;
  language: string;
}

interface Device {
  id: string;
  deviceId: string;
  name: string;
  location: string;
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
  lastSeen: string | null;
  configuration: DeviceConfiguration;
  createdAt: string;
  _count?: {
    surveys: number;
  };
}

interface DeviceStats {
  total: number;
  active: number;
  inactive: number;
  maintenance: number;
}

interface PaginationMeta {
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

type SortOrder = "asc" | "desc";

export default function DevicePage() {
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
  const statusFilter = searchParams.get("status") || "";

  // Component state
  const [devices, setDevices] = useState<Device[]>([]);
  const [stats, setStats] = useState<DeviceStats>({ total: 0, active: 0, inactive: 0, maintenance: 0 });
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>({ total: 0, totalPages: 1, hasNext: false, hasPrev: false });
  const [isDataLoading, setIsDataLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [editedDevice, setEditedDevice] = useState<Partial<Device>>({});
  const [editedConfig, setEditedConfig] = useState<Partial<DeviceConfiguration>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  const getStatusBadgeClass = useCallback((statusValue: Device["status"]) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (statusValue) {
      case "ACTIVE": return `${baseClasses} bg-green-100 text-green-800`;
      case "INACTIVE": return `${baseClasses} bg-red-100 text-red-800`;
      case "MAINTENANCE": return `${baseClasses} bg-yellow-100 text-yellow-800`;
      default: return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  }, []);

  const updateSearchParams = useCallback((paramsToUpdate: Record<string, string | number | null>) => {
    const newParams = new URLSearchParams(searchParams.toString());
    Object.entries(paramsToUpdate).forEach(([key, value]) => {
      if (value === null || value === '') {
        newParams.delete(key);
      } else {
        newParams.set(key, String(value));
      }
    });
    router.push(`${pathname}?${newParams.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const fetchData = useCallback(async () => {
    if (sessionStatus !== "authenticated" || !session?.user?.accessToken) return;
    setIsDataLoading(true);
    try {
      const apiParams: Record<string, string | number> = {
        page,
        limit,
        sortBy,
        sortOrder,
      };
      if (locationFilter) apiParams.location = locationFilter;
      if (statusFilter) apiParams.status = statusFilter;

      const [deviceRes, statsRes] = await Promise.all([
        apiClient.get("/devices", {
          params: apiParams,
          headers: { Authorization: `Bearer ${session.user.accessToken}` },
        }),
        apiClient.get("/devices/stats", {
          headers: { Authorization: `Bearer ${session.user.accessToken}` },
        })
      ]);
      
      setDevices(deviceRes.data.data || []);
      setPaginationMeta(deviceRes.data.meta?.pagination || { total: 0, totalPages: 1, hasNext: false, hasPrev: false });
      setStats(statsRes.data.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error(`Failed to fetch device data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDataLoading(false);
    }
  }, [sessionStatus, session, page, limit, sortBy, sortOrder, locationFilter, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const handleFilterChange = (key: 'location' | 'status', value: string) => {
    updateSearchParams({ [key]: value, page: 1 });
  };
  
  const resetFilters = () => {
    updateSearchParams({ location: null, status: null, page: 1 });
  };

  const handleUpdateDevice = async () => {
    if (!selectedDevice || !session?.user?.accessToken || isUpdating) return;
    setIsUpdating(true); 
    try {
      await apiClient.put(`/devices/${selectedDevice.id}`, editedDevice, {
        headers: { Authorization: `Bearer ${session.user.accessToken}` },
      });
      toast.success("Device updated successfully.");
      closeAllModals();
      await fetchData();
    } catch (error) {
      console.error("Failed to update device:", error);
      toast.error(`Failed to update device: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateConfig = async () => {
    if (!selectedDevice || !session?.user?.accessToken || isUpdating) return;
    setIsUpdating(true);
    try {
      await apiClient.put(
        `/devices/${selectedDevice.id}/config`,
        { configuration: editedConfig },
        { headers: { Authorization: `Bearer ${session.user.accessToken}` } }
      );
      toast.success("Device configuration updated.");
      closeAllModals();
      await fetchData();
    } catch (error) {
      console.error("Failed to update configuration:", error);
      toast.error(`Failed to update configuration: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleDeleteDevice = async () => {
    if (!selectedDevice || !session?.user?.accessToken || isUpdating) return;
    setIsUpdating(true);
    try {
      await apiClient.delete(`/devices/${selectedDevice.id}`, {
        headers: { Authorization: `Bearer ${session.user.accessToken}` },
      });
      toast.success("Device deleted successfully.");
      closeAllModals();
      await fetchData();
    } catch (error) {
      console.error("Failed to delete device:", error);
      toast.error(`Failed to delete device: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const openModal = useCallback((device: Device) => {
    setSelectedDevice(device);
    setEditedDevice({ name: device.name, location: device.location, status: device.status });
    setIsModalOpen(true);
  }, []);
  
  const openConfigModal = useCallback((device: Device) => {
    setSelectedDevice(device);
    setEditedConfig({ ...device.configuration });
    setIsConfigModalOpen(true);
  }, []);

  const openDeleteModal = useCallback((device: Device) => {
    setSelectedDevice(device);
    setIsDeleteModalOpen(true);
  }, []);

  const closeAllModals = useCallback(() => {
    setIsModalOpen(false);
    setIsConfigModalOpen(false);
    setIsDeleteModalOpen(false);
    setSelectedDevice(null);
    setEditedDevice({});
    setEditedConfig({});
  }, []);

  const columns = useMemo<ColumnDef<Device>[]>(
    () => [
      { id: "name", header: "Name", cell: (device) => device.name, enableSorting: true },
      { id: "location", header: "Location", cell: (device) => device.location, enableSorting: true },
      {
        id: "status",
        header: "Status",
        cell: (device) => (
          <span className={getStatusBadgeClass(device.status)}>{device.status}</span>
        ),
        enableSorting: true,
      },
      {
        id: "lastSeen",
        header: "Last Seen",
        cell: (device) => (device.lastSeen ? new Date(device.lastSeen).toLocaleString() : "N/A"),
        enableSorting: true,
      },
      { id: "surveys", header: "Surveys", cell: (device) => device._count?.surveys ?? 0 },
      {
        id: "actions",
        header: "Actions",
        cell: (device) => (
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => openModal(device)} disabled={isUpdating}>
              <PencilIcon className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => openConfigModal(device)} disabled={isUpdating}>
              <SettingsIcon className="h-4 w-4" />
            </Button>
            <Button variant="destructive" size="icon" onClick={() => openDeleteModal(device)} disabled={isUpdating}>
              <Trash2Icon className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [isUpdating, openModal, openConfigModal, openDeleteModal, getStatusBadgeClass]
  );

  if (sessionStatus === "loading") {
    return <div className="p-4 md:p-8">Loading...</div>;
  }

  if (sessionStatus === "unauthenticated") {
    return <div className="p-4 md:p-8">Please log in to access this page.</div>;
  }

  return (
    <div className="p-4 md:p-8">
      <h2 className="text-xl font-bold mb-4">Device Management</h2>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard title="Total Devices" value={stats.total} icon={<PowerIcon className="text-gray-500" />} colors="from-gray-50 to-gray-100" textColor="text-gray-700" />
        <StatCard title="Active" value={stats.active} icon={<PowerIcon className="text-green-500" />} colors="from-green-50 to-green-100" textColor="text-green-700" />
        <StatCard title="Inactive" value={stats.inactive} icon={<PowerOffIcon className="text-red-500" />} colors="from-red-50 to-red-100" textColor="text-red-700" />
        <StatCard title="Maintenance" value={stats.maintenance} icon={<SettingsIcon className="text-yellow-500" />} colors="from-yellow-50 to-yellow-100" textColor="text-yellow-700" />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <Input
          placeholder="Filter by location..."
          value={locationFilter}
          onChange={(e) => handleFilterChange('location', e.target.value)}
          className="max-w-sm"
        />
        <Select
          value={statusFilter || "all"}
          onValueChange={(value) => handleFilterChange('status', value === "all" ? "" : value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={resetFilters} disabled={!locationFilter && !statusFilter}>
          Reset Filters
        </Button>
      </div>

      {/* Devices Table */}
      <div className="rounded-md border mb-6 px-5">
        <DynamicTable
            columns={columns}
            data={devices}
            isLoading={isDataLoading}
            onSort={handleSort}
            sortBy={sortBy}
            sortOrder={sortOrder}
            emptyStateMessage="No devices found"
        />
      </div>

      {/* Pagination */}
      <PaginationControls
          page={page}
          limit={limit}
          totalPages={paginationMeta.totalPages}
          hasNext={paginationMeta.hasNext}
          hasPrev={paginationMeta.hasPrev}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
      />

      {/* Edit Modal */}
      {isModalOpen && selectedDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="font-semibold text-lg mb-4">Edit Device: {selectedDevice.name}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Device Name</label>
                <Input
                  value={editedDevice.name || ""}
                  onChange={(e) => setEditedDevice({...editedDevice, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Location</label>
                <Input
                  value={editedDevice.location || ""}
                  onChange={(e) => setEditedDevice({...editedDevice, location: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <Select
                  value={editedDevice.status || ""}
                  onValueChange={(value) => setEditedDevice({...editedDevice, status: value as Device["status"]})}
                >
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button variant="outline" onClick={closeAllModals} className="flex-1" disabled={isUpdating}>
                Cancel
              </Button>
              <Button variant="default" onClick={handleUpdateDevice} className="flex-1" disabled={isUpdating}>
                {isUpdating ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Config Modal */}
      {isConfigModalOpen && selectedDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="font-semibold text-lg mb-4">Configuration for {selectedDevice.name}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Survey Interval (seconds)</label>
                <Input
                  type="number"
                  value={editedConfig.surveyInterval || ""}
                  onChange={(e) => setEditedConfig({
                    ...editedConfig, 
                    surveyInterval: parseInt(e.target.value) || 0
                  })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Theme</label>
                <Input
                  value={editedConfig.theme || ""}
                  onChange={(e) => setEditedConfig({...editedConfig, theme: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Language</label>
                <Input
                  value={editedConfig.language || ""}
                  onChange={(e) => setEditedConfig({...editedConfig, language: e.target.value})}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <Button variant="outline" onClick={closeAllModals} className="flex-1" disabled={isUpdating}>
                Cancel
              </Button>
              <Button variant="default" onClick={handleUpdateConfig} className="flex-1" disabled={isUpdating}>
                {isUpdating ? "Saving..." : "Save Configuration"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedDevice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
            <h2 className="font-semibold text-lg mb-2">Confirm Deletion</h2>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to delete the device &quot;{selectedDevice.name}&quot;? This action cannot be undone.
            </p>
            <div className="flex gap-2 mt-6">
              <Button variant="outline" onClick={closeAllModals} className="flex-1" disabled={isUpdating}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteDevice} className="flex-1" disabled={isUpdating}>
                {isUpdating ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}