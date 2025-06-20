"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api/client";
import { useSession } from "next-auth/react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
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
import { StatCard } from "@/components/ui/StatCard";

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

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface Filters {
  location: string;
  status: string;
}

type SortOrder = "asc" | "desc";

export default function DevicePage() {
  const { data: session, status } = useSession();
  
  // Main data states
  const [devices, setDevices] = useState<Device[]>([]);
  const [stats, setStats] = useState<DeviceStats>({
    total: 0,
    active: 0,
    inactive: 0,
    maintenance: 0,
  });
  
  // Pagination and filtering states
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });
  const [filters, setFilters] = useState<Filters>({ location: "", status: "" });
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [editedDevice, setEditedDevice] = useState<Partial<Device>>({});
  const [editedConfig, setEditedConfig] = useState<Partial<DeviceConfiguration>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  // Extract page and limit from pagination state
  const { page, limit } = pagination;

  const fetchData = useCallback(async () => {
    if (status !== "authenticated" || !session?.user?.accessToken) return;

    try {
      const params: Record<string, string | number> = {
        page,
        limit,
        sortBy,
        sortOrder,
      };
      if (filters.location) params.location = filters.location;
      if (filters.status) params.status = filters.status;

      const deviceRes = await apiClient.get("/devices", {
        params,
        headers: { Authorization: `Bearer ${session.user.accessToken}` },
      });
      setDevices(deviceRes.data.data || []);

      // Only update pagination if the API provides new data for it.
      // This avoids depending on the old 'pagination' state, which caused the infinite loop.
      const newPagination = deviceRes.data.meta?.pagination;
      if (newPagination) {
        setPagination(newPagination);
      }

      const statsRes = await apiClient.get("/devices/stats", {
        headers: { Authorization: `Bearer ${session.user.accessToken}` },
      });
      setStats(statsRes.data.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error(`Failed to fetch device data: ${error}`);
    }
    // With the change above, 'pagination' is no longer a dependency of this function.
  }, [session, status, page, limit, filters, sortBy, sortOrder]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const handlePageChange = useCallback((newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  }, []);

  const handleLimitChange = useCallback((newLimit: number) => {
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({ location: "", status: "" });
  }, []);

  const handleUpdateDevice = async () => {
    if (!selectedDevice || !session?.user?.accessToken || isUpdating) return;
    
    setIsUpdating(true);
    try {
      await apiClient.put(`/devices/${selectedDevice.id}`, editedDevice, {
        headers: { Authorization: `Bearer ${session.user.accessToken}` },
      });
      toast.success("Device updated successfully.");
      setIsModalOpen(false);
      setSelectedDevice(null);
      setEditedDevice({});
      await fetchData();
    } catch (error) {
      console.error("Failed to update device:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to update device: ${errorMessage}`);
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
      setIsConfigModalOpen(false);
      setSelectedDevice(null);
      setEditedConfig({});
      await fetchData();
    } catch (error) {
      console.error("Failed to update configuration:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to update configuration: ${errorMessage}`);
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
      setIsDeleteModalOpen(false);
      setSelectedDevice(null);
      await fetchData();
    } catch (error) {
      console.error("Failed to delete device:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to delete device: ${errorMessage}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const openModal = useCallback((device: Device) => {
    setSelectedDevice(device);
    setEditedDevice({ 
      name: device.name, 
      location: device.location, 
      status: device.status 
    });
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

  const getStatusBadgeClass = (status: Device["status"]) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case "ACTIVE":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "INACTIVE":
        return `${baseClasses} bg-red-100 text-red-800`;
      case "MAINTENANCE":
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  if (status === "loading") {
    return <div className="p-4 md:p-8">Loading...</div>;
  }

  if (status === "unauthenticated") {
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
          value={filters.location}
          onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
          className="max-w-sm"
        />
        <Select
          value={filters.status || "all"}
          onValueChange={(value) => setFilters(prev => ({ 
            ...prev, 
            status: value === "all" ? "" : value 
          }))}
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
        <Button onClick={resetFilters} disabled={!filters.location && !filters.status}>
          Reset Filters
        </Button>
      </div>

      {/* Devices Table */}
      <div className="overflow-x-auto mb-6">
        {isUpdating ? (
          <div className="text-center py-8">Loading devices...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
                  Name {sortBy === "name" && (sortOrder === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("location")}>
                  Location {sortBy === "location" && (sortOrder === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("status")}>
                  Status {sortBy === "status" && (sortOrder === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort("lastSeen")}>
                  Last Seen {sortBy === "lastSeen" && (sortOrder === "asc" ? "↑" : "↓")}
                </TableHead>
                <TableHead>Surveys</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No devices found
                  </TableCell>
                </TableRow>
              ) : (
                devices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell>{device.name}</TableCell>
                    <TableCell>{device.location}</TableCell>
                    <TableCell>
                      <span className={getStatusBadgeClass(device.status)}>
                        {device.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {device.lastSeen ? new Date(device.lastSeen).toLocaleString() : "N/A"}
                    </TableCell>
                    <TableCell>{device._count?.surveys ?? 0}</TableCell>
                    <TableCell className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => openModal(device)}
                        disabled={isUpdating}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => openConfigModal(device)}
                        disabled={isUpdating}
                      >
                        <SettingsIcon className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="icon" 
                        onClick={() => openDeleteModal(device)}
                        disabled={isUpdating}
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mt-4">
        <div className="flex gap-1 items-center">
          <button
            className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-2 focus:ring-primary disabled:opacity-50 transition"
            disabled={pagination.page === 1}
            onClick={() => handlePageChange(1)}
            aria-label="First page"
          >«</button>
          <button
            className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-2 focus:ring-primary disabled:opacity-50 transition"
            disabled={!pagination.hasPrev}
            onClick={() => handlePageChange(page - 1)}
            aria-label="Previous page"
          >‹</button>
          <span className="mx-2 text-sm font-medium">Page {pagination.page} of {pagination.totalPages}</span>
          <button
            className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-2 focus:ring-primary disabled:opacity-50 transition"
            disabled={!pagination.hasNext}
            onClick={() => handlePageChange(page + 1)}
            aria-label="Next page"
          >›</button>
          <button
            className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-2 focus:ring-primary disabled:opacity-50 transition"
            disabled={pagination.page === pagination.totalPages}
            onClick={() => handlePageChange(pagination.totalPages)}
            aria-label="Last page"
          >»</button>
        </div>
        <div className="flex gap-2 items-center justify-end">
          <span className="text-sm">Rows per page:</span>
          <select
            className="border px-2 py-1 rounded text-sm focus:ring-2 focus:ring-primary"
            value={limit}
            onChange={(e) => handleLimitChange(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

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