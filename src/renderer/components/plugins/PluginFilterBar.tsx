/**
 * PluginFilterBar - Search and filter controls for plugin management
 *
 * Features:
 * - Search by name, description, or author
 * - Filter by status (All, Active, Inactive, Error)
 * - Filter by capability (Has Tools, Has Skills, Has Agents, Has MCP)
 * - Filter by category
 * - Sort options (Name, Status, Date, Capabilities)
 * - Clear filters button
 */

import React from 'react';
import { Input, Select, Button } from '@arco-design/web-react';
import { IconSearch, IconRefresh, IconClose } from '@arco-design/web-react/icon';
import type { PluginRegistryEntry } from '@/plugin/types';

export interface FilterOptions {
  searchQuery: string;
  statusFilter: 'all' | 'active' | 'inactive' | 'error';
  capabilityFilter: 'all' | 'tools' | 'skills' | 'agents' | 'mcp';
  categoryFilter: string;
  sortBy: 'name-asc' | 'name-desc' | 'status' | 'date' | 'capabilities';
}

interface PluginFilterBarProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  onRefresh: () => void;
  plugins: PluginRegistryEntry[];
  isLoading?: boolean;
}

const PluginFilterBar: React.FC<PluginFilterBarProps> = ({
  filters,
  onFiltersChange,
  onRefresh,
  plugins,
  isLoading,
}) => {
  // Extract unique categories from plugins
  const categories = React.useMemo(() => {
    const categorySet = new Set<string>();
    plugins.forEach((plugin) => {
      plugin.categories?.forEach((cat) => categorySet.add(cat));
    });
    return Array.from(categorySet).sort();
  }, [plugins]);

  const hasActiveFilters =
    filters.searchQuery !== '' ||
    filters.statusFilter !== 'all' ||
    filters.capabilityFilter !== 'all' ||
    filters.categoryFilter !== 'all';

  const handleClearFilters = () => {
    onFiltersChange({
      searchQuery: '',
      statusFilter: 'all',
      capabilityFilter: 'all',
      categoryFilter: 'all',
      sortBy: 'name-asc',
    });
  };

  return (
    <div className='mb-20px space-y-12px'>
      {/* Search and Refresh Row */}
      <div className='flex items-center gap-12px'>
        <Input
          prefix={<IconSearch />}
          placeholder='Search plugins by name, description, or author...'
          value={filters.searchQuery}
          onChange={(value) => onFiltersChange({ ...filters, searchQuery: value })}
          className='flex-1'
          allowClear
        />
        <Button
          icon={<IconRefresh />}
          onClick={onRefresh}
          loading={isLoading}
          className='whitespace-nowrap'
        >
          Refresh
        </Button>
      </div>

      {/* Filter Controls Row */}
      <div className='flex items-center gap-12px flex-wrap'>
        {/* Status Filter */}
        <Select
          placeholder='Status'
          value={filters.statusFilter}
          onChange={(value) => onFiltersChange({ ...filters, statusFilter: value as FilterOptions['statusFilter'] })}
          className='w-140px'
        >
          <Select.Option value='all'>All Status</Select.Option>
          <Select.Option value='active'>Active</Select.Option>
          <Select.Option value='inactive'>Inactive</Select.Option>
          <Select.Option value='error'>Error</Select.Option>
        </Select>

        {/* Capability Filter */}
        <Select
          placeholder='Capability'
          value={filters.capabilityFilter}
          onChange={(value) =>
            onFiltersChange({ ...filters, capabilityFilter: value as FilterOptions['capabilityFilter'] })
          }
          className='w-160px'
        >
          <Select.Option value='all'>All Capabilities</Select.Option>
          <Select.Option value='tools'>Has Tools</Select.Option>
          <Select.Option value='skills'>Has Skills</Select.Option>
          <Select.Option value='agents'>Has Agents</Select.Option>
          <Select.Option value='mcp'>Has MCP Servers</Select.Option>
        </Select>

        {/* Category Filter */}
        <Select
          placeholder='Category'
          value={filters.categoryFilter}
          onChange={(value) => onFiltersChange({ ...filters, categoryFilter: value })}
          className='w-160px'
          disabled={categories.length === 0}
        >
          <Select.Option value='all'>All Categories</Select.Option>
          {categories.map((cat) => (
            <Select.Option key={cat} value={cat}>
              {cat}
            </Select.Option>
          ))}
        </Select>

        {/* Sort By */}
        <Select
          placeholder='Sort by'
          value={filters.sortBy}
          onChange={(value) => onFiltersChange({ ...filters, sortBy: value as FilterOptions['sortBy'] })}
          className='w-180px'
        >
          <Select.Option value='name-asc'>Name (A-Z)</Select.Option>
          <Select.Option value='name-desc'>Name (Z-A)</Select.Option>
          <Select.Option value='status'>Status</Select.Option>
          <Select.Option value='date'>Recently Installed</Select.Option>
          <Select.Option value='capabilities'>Most Capabilities</Select.Option>
        </Select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            icon={<IconClose />}
            onClick={handleClearFilters}
            type='text'
            className='ml-auto'
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className='flex items-center gap-8px flex-wrap text-13px'>
          <span className='text-t-secondary'>Active filters:</span>
          {filters.searchQuery && (
            <span className='px-12px py-4px bg-primary/10 text-primary rd-100px'>
              Search: "{filters.searchQuery}"
            </span>
          )}
          {filters.statusFilter !== 'all' && (
            <span className='px-12px py-4px bg-primary/10 text-primary rd-100px'>
              Status: {filters.statusFilter}
            </span>
          )}
          {filters.capabilityFilter !== 'all' && (
            <span className='px-12px py-4px bg-primary/10 text-primary rd-100px'>
              Capability: {filters.capabilityFilter}
            </span>
          )}
          {filters.categoryFilter !== 'all' && (
            <span className='px-12px py-4px bg-primary/10 text-primary rd-100px'>
              Category: {filters.categoryFilter}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default PluginFilterBar;
export type { FilterOptions };
