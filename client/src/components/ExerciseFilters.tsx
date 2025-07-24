// client/src/components/ExerciseFilters.tsx
import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FilterX } from "lucide-react";

interface FilterValues {
  searchTerm: string;
  grupo: string;
  categoria: string;
}

interface ExerciseFiltersProps {
  grupos: string[];
  categorias: string[];
  filters: FilterValues;
  onFilterChange: (filters: Partial<FilterValues>) => void;
  onClearFilters: () => void;
}

const ALL_FILTER_VALUE = "all";

const ExerciseFilters: React.FC<ExerciseFiltersProps> = ({
  grupos,
  categorias,
  filters,
  onFilterChange,
  onClearFilters,
}) => {
  return (
    <div className="space-y-4">
      <Input
        placeholder="Buscar por nome..."
        value={filters.searchTerm}
        onChange={(e) => onFilterChange({ searchTerm: e.target.value })}
        className="w-full bg-background dark:bg-input"
      />
      <Select
        onValueChange={(value) => onFilterChange({ grupo: value })}
        value={filters.grupo}
      >
        <SelectTrigger className="w-full bg-background dark:bg-input">
          <SelectValue placeholder="Grupo muscular" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_FILTER_VALUE}>Todos os Grupos</SelectItem>
          {grupos.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select
        onValueChange={(value) => onFilterChange({ categoria: value })}
        value={filters.categoria}
      >
        <SelectTrigger className="w-full bg-background dark:bg-input">
          <SelectValue placeholder="Tipo/Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_FILTER_VALUE}>Todos os Tipos</SelectItem>
          {categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button variant="ghost" onClick={onClearFilters} className="w-full justify-center text-muted-foreground hover:text-foreground">
        <FilterX className="w-4 h-4 mr-2" />
        Limpar Filtros
      </Button>
    </div>
  );
};

export default ExerciseFilters;