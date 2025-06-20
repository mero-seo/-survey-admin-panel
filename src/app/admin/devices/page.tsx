"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function DevicePage() {
  const { data: session, status } = useSession();
  const [devices, setDevices] = useState<Device[]>([]);
  const [stats, setStats] = useState<DeviceStats>({
    total: 0,
    active: 0,
    inactive: 0,
    maintenance: 0,
  });
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filters, setFilters] = useState({ location: "", status: "" });
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [editedDevice, setEditedDevice] = useState<Partial<Device>>({});
  const [editedConfig, setEditedConfig] = useState<Partial<DeviceConfiguration>>({});

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
      setPagination(deviceRes.data.meta?.pagination || pagination);

      const statsRes = await apiClient.get("/devices/stats", {
        headers: { Authorization: `Bearer ${session.user.accessToken}` },
      });
      setStats(statsRes.data.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error(`Failed to fetch device data: ${error}`);
    }
  }, [session, status, page, limit, filters, sortBy, sortOrder, pagination]);

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

  const handleUpdateDevice = async () => {
    if (!selectedDevice || !session?.user?.accessToken) return;
    try {
      await apiClient.put(`/devices/${selectedDevice.id}`, editedDevice, {
        headers: { Authorization: `Bearer ${session.user.accessToken}` },
      });
      toast.success("Device updated successfully.");
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(`Failed to update device. ${error}`);
    }
  };

  const handleUpdateConfig = async () => {
    if (!selectedDevice || !session?.user?.accessToken) return;
    try {
      await apiClient.put(
        `/devices/${selectedDevice.id}/config`,
        { configuration: editedConfig },
        { headers: { Authorization: `Bearer ${session.user.accessToken}` } }
      );
      toast.success("Device configuration updated.");
      setIsConfigModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(`Failed to update configuration. ${error}`);
    }
  };
  
  const handleDeleteDevice = async () => {
    if (!selectedDevice || !session?.user?.accessToken) return;
    try {
      await apiClient.delete(`/devices/${selectedDevice.id}`, {
        headers: { Authorization: `Bearer ${session.user.accessToken}` },
      });
      toast.success("Device deleted successfully.");
      setIsDeleteModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(`Failed to delete device. ${error}`);
    }
  };

  const openModal = (device: Device) => {
    setSelectedDevice(device);
    setEditedDevice({ 
      name: device.name, 
      location: device.location, 
      status: device.status 
    });
    setIsModalOpen(true);
  };
  
  const openConfigModal = (device: Device) => {
    setSelectedDevice(device);
    setEditedConfig(device.configuration);
    setIsConfigModalOpen(true);
  };

  const openDeleteModal = (device: Device) => {
    setSelectedDevice(device);
    setIsDeleteModalOpen(true);
  };

  const statCards = useMemo(
    () => [
      { 
        title: "Total Devices", 
        value: stats.total, 
        icon: <PowerIcon className="h-4 w-4" /> 
      },
      { 
        title: "Active", 
        value: stats.active, 
        icon: <PowerIcon className="h-4 w-4 text-green-500" /> 
      },
      { 
        title: "Inactive", 
        value: stats.inactive, 
        icon: <PowerOffIcon className="h-4 w-4 text-red-500" /> 
      },
      { 
        title: "Maintenance", 
        value: stats.maintenance, 
        icon: <SettingsIcon className="h-4 w-4 text-yellow-500" /> 
      },
    ],
    [stats]
  );

  return (
    <div className="p-4 md:p-8">
      <h2 className="text-xl font-bold mb-4">Device Management</h2>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {statCards.map((card, idx) => (
          <Card key={idx}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              {card.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <Input
          placeholder="Filter by location..."
          value={filters.location}
          onChange={(e) => setFilters({ ...filters, location: e.target.value })}
          className="max-w-sm"
        />
        <Select
          value={filters.status || "all"}
          onValueChange={(value) => setFilters({ ...filters, status: value === "all" ? "" : value })}
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
        <Button onClick={() => setFilters({ location: "", status: "" })}>
          Reset Filters
        </Button>
      </div>

      {/* Devices Table */}
      <div className="overflow-x-auto mb-6">
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
            {devices.map((device) => (
              <TableRow key={device.id}>
                <TableCell>{device.name}</TableCell>
                <TableCell>{device.location}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    device.status === "ACTIVE" ? "bg-green-100 text-green-800" :
                    device.status === "INACTIVE" ? "bg-red-100 text-red-800" :
                    "bg-yellow-100 text-yellow-800"
                  }`}>
                    {device.status}
                  </span>
                </TableCell>
                <TableCell>{device.lastSeen ? new Date(device.lastSeen).toLocaleString() : "N/A"}</TableCell>
                <TableCell>{device._count?.surveys ?? 0}</TableCell>
                <TableCell className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => openModal(device)}>
                    <PencilIcon className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => openConfigModal(device)}>
                    <SettingsIcon className="h-4 w-4" />
                  </Button>
                  <Button variant="destructive" size="icon" onClick={() => openDeleteModal(device)}>
                    <Trash2Icon className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
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
              <Button variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1">Cancel</Button>
              <Button variant="default" onClick={handleUpdateDevice} className="flex-1">Save Changes</Button>
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
              <Button variant="outline" onClick={() => setIsConfigModalOpen(false)} className="flex-1">Cancel</Button>
              <Button variant="default" onClick={handleUpdateConfig} className="flex-1">Save Configuration</Button>
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
              <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)} className="flex-1">Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteDevice} className="flex-1">Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}