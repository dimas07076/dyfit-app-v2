// client/src/pages/exercises/index.tsx
import { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, BrainCircuit, User, SearchX, SlidersHorizontal } from "lucide-react"; // <<< CORREÇÃO: 'FilterX' removido
import ExerciseFormModal from "@/components/dialogs/ExerciseFormModal";
import ExerciseEditModal from "@/components/dialogs/ExerciseEditModal";
import ExerciseDeleteButton from "@/components/buttons/ExerciseDeleteButton";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@/context/UserContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { fetchWithAuth } from "@/lib/apiClient";
import LiteYouTubeEmbed from "@/components/LiteYouTubeEmbed";
import LiteGoogleDriveEmbed from "@/components/LiteGoogleDriveEmbed";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import ExerciseFilters from '@/components/ExerciseFilters'; // <<< CORREÇÃO: Caminho da importação ajustado

// --- Interfaces, Funções e Constantes (sem alteração) ---
interface Exercicio { _id: string; nome: string; descricao?: string; grupoMuscular?: string; categoria?: string; urlVideo?: string; isCustom: boolean; isFavoritedByCurrentUser?: boolean; }
type AbaSelecionada = "todos" | "app" | "meus" | "favoritos";
const ALL_FILTER_VALUE = "all";
const getYouTubeId = (url?: string): string | undefined => { if (!url) return undefined; const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/; const match = url.match(regExp); return (match && match[2].length === 11) ? match[2] : undefined; };
const getGoogleDriveId = (url?: string): string | undefined => { if (!url) return undefined; const patterns = [ /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/, /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/, ]; for (const pattern of patterns) { const match = url.match(pattern); if (match && match[1]) { return match[1]; } } return undefined; };
const grupos = ["Peitoral", "Pernas", "Costas", "Ombros", "Bíceps", "Tríceps", "Abdômen", "Lombar", "Glúteos", "Panturrilha", "Cardio", "Corpo Inteiro", "Outro"].sort();
const categorias = ["Força", "Resistência", "Hipertrofia", "Potência", "Cardiovascular", "Flexibilidade", "Mobilidade", "Funcional", "Calistenia", "Outro"].sort();

// --- Componente ExerciseList (sem alteração) ---
const ExerciseList = ({ exercicios, onFavoriteToggle, onFetch, isAdmin }: { exercicios: Exercicio[], onFavoriteToggle: (id: string, isFavorited: boolean) => void, onFetch: () => void, isAdmin: boolean }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
    {exercicios.map((ex) => {
      const isFavorited = ex.isFavoritedByCurrentUser ?? false;
      const youtubeId = getYouTubeId(ex.urlVideo);
      const googleDriveId = getGoogleDriveId(ex.urlVideo);
      const canEditOrDelete = ex.isCustom || isAdmin;
      return (
        <Card key={ex._id} className="rounded-xl border bg-card text-card-foreground shadow-sm flex flex-col overflow-hidden transition-transform transform hover:-translate-y-1">
          <div className="w-full h-40 bg-gray-200 dark:bg-gray-700 relative">
            {youtubeId ? ( <LiteYouTubeEmbed id={youtubeId} title={ex.nome} /> ) : googleDriveId ? ( <LiteGoogleDriveEmbed id={googleDriveId} title={ex.nome} /> ) : ( <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">Sem Vídeo</div> )}
          </div>
          <CardContent className="p-4 flex-grow flex flex-col">
            <div className="flex gap-1 mb-2 flex-wrap">
              {ex.grupoMuscular && <Badge variant="secondary">{ex.grupoMuscular}</Badge>}
              {ex.categoria && <Badge variant="outline">{ex.categoria}</Badge>}
            </div>
            <h2 className="font-semibold text-base truncate mb-1" title={ex.nome}>{ex.nome}</h2>
            <p className="text-xs text-muted-foreground line-clamp-2 flex-grow mb-2" title={ex.descricao ?? ''}>{ex.descricao || 'Nenhuma descrição.'}</p>
            <div className="flex gap-1 items-center justify-end mt-auto pt-2 border-t">
              <TooltipProvider delayDuration={100}>
                {ex.isCustom ? ( <Tooltip><TooltipTrigger><User className="w-4 h-4 text-blue-500" /></TooltipTrigger><TooltipContent><p>Exercício Personalizado</p></TooltipContent></Tooltip> ) : ( <Tooltip><TooltipTrigger><BrainCircuit className="w-4 h-4 text-purple-500" /></TooltipTrigger><TooltipContent><p>Exercício do App</p></TooltipContent></Tooltip> )}
              </TooltipProvider>
              {canEditOrDelete && ( <> <ExerciseEditModal exercicio={ex} onUpdated={onFetch} gruposMusculares={grupos} categoriasExercicio={categorias} /> <ExerciseDeleteButton exercicioId={ex._id} onDeleted={onFetch} /> </> )}
              <Button variant="ghost" size="icon" onClick={() => onFavoriteToggle(ex._id, isFavorited)} title={isFavorited ? "Desfavoritar" : "Favoritar"} className="h-7 w-7"><Star className={`w-4 h-4 ${isFavorited ? 'fill-yellow-400 text-yellow-500' : 'text-muted-foreground hover:text-yellow-500'}`} /></Button>
            </div>
          </CardContent>
        </Card>
      );
    })}
  </div>
);

export default function ExercisesPage() {
  const { user } = useUser();
  const isAdmin = !!user && user.role.toLowerCase() === 'admin';
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [aba, setAba] = useState<AbaSelecionada>(isAdmin ? 'app' : 'todos');
  const [filters, setFilters] = useState({
    searchTerm: "",
    grupo: ALL_FILTER_VALUE,
    categoria: ALL_FILTER_VALUE,
  });

  const { data, isLoading } = useQuery<Exercicio[]>({
    queryKey: ['exercicios', aba, filters.grupo, filters.categoria],
    queryFn: () => {
      const params = new URLSearchParams({ tipo: aba, grupo: filters.grupo, categoria: filters.categoria });
      return fetchWithAuth(`/api/exercicios/biblioteca?${params.toString()}`);
    },
    placeholderData: (prev) => prev,
  });

  const filteredExercises = useMemo(() => {
    if (!data) return [];
    return data.filter(ex => ex.nome.toLowerCase().includes(filters.searchTerm.toLowerCase())).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [data, filters.searchTerm]);

  const handleFilterChange = (newFilters: Partial<typeof filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleClearFilters = () => {
    setFilters({ searchTerm: "", grupo: ALL_FILTER_VALUE, categoria: ALL_FILTER_VALUE });
  };
  
  const activeFilterCount = Object.values(filters).filter(value => value !== "" && value !== ALL_FILTER_VALUE).length;

  const handleFavoriteToggle = async (id: string, isFavorited: boolean) => { try { await fetchWithAuth(`/api/exercicios/${id}/favorite`, { method: isFavorited ? "DELETE" : "POST" }); toast({ title: "Sucesso", description: `Exercício ${isFavorited ? 'desfavoritado' : 'favoritado'}.` }); queryClient.invalidateQueries({ queryKey: ['exercicios'] }); } catch (err: any) { toast({ title: "Erro", description: err.message, variant: "destructive" }); } };
  const handleFetch = () => { queryClient.invalidateQueries({ queryKey: ['exercicios', aba] }); };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Biblioteca de Exercícios</h1>
          <p className="text-muted-foreground">Encontre, crie e gerencie os exercícios para seus treinos.</p>
        </div>
        <div className="flex-shrink-0">
          {isAdmin ? <ExerciseFormModal onCreated={handleFetch} creationType="app" triggerButtonText="Criar Exercício do App" /> : <ExerciseFormModal onCreated={handleFetch} creationType="personal" triggerButtonText="Criar Meu Exercício" />}
        </div>
      </div>

      <Tabs defaultValue={isAdmin ? 'app' : 'todos'} onValueChange={(v) => setAba(v as AbaSelecionada)} className="w-full">
        <div className="overflow-x-auto pb-2">
            <TabsList className="min-w-full sm:min-w-0 sm:grid sm:w-full sm:grid-cols-4">
            {!isAdmin && <TabsTrigger value="todos">Todos</TabsTrigger>}
            <TabsTrigger value="app">Exercícios do App</TabsTrigger>
            {!isAdmin && <TabsTrigger value="meus">Meus Exercícios</TabsTrigger>}
            <TabsTrigger value="favoritos">Favoritos</TabsTrigger>
            </TabsList>
        </div>
      </Tabs>
      
      <Card className="hidden sm:block">
        <CardHeader>
            <CardTitle className="text-lg">Filtros</CardTitle>
            <CardDescription>Refine sua busca para encontrar exercícios específicos.</CardDescription>
        </CardHeader>
        <CardContent>
            <ExerciseFilters 
                grupos={grupos} 
                categorias={categorias}
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
            />
        </CardContent>
      </Card>

      <div className="sm:hidden">
        <Drawer>
            <DrawerTrigger asChild>
                <Button variant="outline" className="w-full justify-center relative">
                    <SlidersHorizontal className="w-4 h-4 mr-2" />
                    Filtros
                    {activeFilterCount > 0 && <span className="absolute top-0 right-0 -mt-1 -mr-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">{activeFilterCount}</span>}
                </Button>
            </DrawerTrigger>
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>Filtrar Exercícios</DrawerTitle>
                    <DrawerDescription>Selecione os filtros para refinar os resultados.</DrawerDescription>
                </DrawerHeader>
                <div className="p-4">
                    <ExerciseFilters 
                        grupos={grupos} 
                        categorias={categorias}
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onClearFilters={handleClearFilters}
                    />
                </div>
                <DrawerFooter>
                    <DrawerClose asChild>
                        <Button>Ver Resultados</Button>
                    </DrawerClose>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-72 w-full rounded-xl" />)}
        </div>
      ) : filteredExercises.length === 0 ? (
        <div className="text-center text-muted-foreground mt-6 py-16 border-2 border-dashed rounded-lg">
          <SearchX className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium">Nenhum exercício encontrado</h3>
          <p className="mt-1 text-sm">Tente ajustar seus filtros ou crie um novo exercício.</p>
        </div>
      ) : (
        <div className="mt-6">
          <ExerciseList exercicios={filteredExercises} onFavoriteToggle={handleFavoriteToggle} onFetch={handleFetch} isAdmin={isAdmin} />
        </div>
      )}
    </div>
  );
}