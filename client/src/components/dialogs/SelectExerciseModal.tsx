// client/src/components/dialogs/SelectExerciseModal.tsx
import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from '@tanstack/react-query';
import { fetchWithAuth } from '@/lib/apiClient';
import { Loader2, CheckCircle, FilterX, Filter, ChevronUp, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast'; // Importar useToast

export interface BibliotecaExercicio { _id: string; nome: string; grupoMuscular?: string; categoria?: string; isCustom?: boolean; }
interface SelectExerciseModalProps { isOpen: boolean; onClose: () => void; onExercisesSelect: (selecionados: BibliotecaExercicio[]) => void; }
type AbaBiblioteca = "todos" | "app" | "meus" | "favoritos";
const ALL_FILTER_VALUE = "all";

export default function SelectExerciseModal({ isOpen, onClose, onExercisesSelect }: SelectExerciseModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [abaSelecionada, setAbaSelecionada] = useState<AbaBiblioteca>("todos");
  const [exerciciosSelecionados, setExerciciosSelecionados] = useState<BibliotecaExercicio[]>([]);
  const [filterGrupoMuscular, setFilterGrupoMuscular] = useState(ALL_FILTER_VALUE);
  const [filterCategoria, setFilterCategoria] = useState(ALL_FILTER_VALUE);
  const [showFilters, setShowFilters] = useState(false); 

  const { toast } = useToast(); // Inicializar useToast

  const { data: exercicios = [], isLoading, error } = useQuery<BibliotecaExercicio[]>({
    queryKey: ["bibliotecaExercicios", abaSelecionada],
    queryFn: () => fetchWithAuth(`/api/exercicios/biblioteca?tipo=${abaSelecionada}`),
    enabled: isOpen,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      setAbaSelecionada("todos");
      setExerciciosSelecionados([]);
      setFilterGrupoMuscular(ALL_FILTER_VALUE);
      setFilterCategoria(ALL_FILTER_VALUE);
      setShowFilters(false); 
    } else {
      // Exibe a instrução do filtro apenas quando o modal abre
      toast({
        title: "Dica de Filtro",
        description: "Clique em 'Filtros' para expandir/recolher as opções.",
        duration: 4000, // A mensagem desaparecerá após 4 segundos
      });
    }
  }, [isOpen, toast]); // Adicionado 'toast' como dependência

  const exerciciosFiltradosEOrdenados = useMemo(() => {
    let filtered = exercicios;

    if (searchTerm) {
      filtered = filtered.filter(ex => ex.nome.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    if (filterGrupoMuscular !== ALL_FILTER_VALUE) {
      filtered = filtered.filter(ex => ex.grupoMuscular === filterGrupoMuscular);
    }

    if (filterCategoria !== ALL_FILTER_VALUE) {
      filtered = filtered.filter(ex => ex.categoria === filterCategoria);
    }

    return filtered.sort((a, b) => a.nome.localeCompare(b.nome));
  }, [exercicios, searchTerm, filterGrupoMuscular, filterCategoria]);

  const handleToggleSelecaoExercicio = (exercicio: BibliotecaExercicio) => {
    setExerciciosSelecionados(prev => {
      if (prev.some(sel => sel._id === exercicio._id)) {
        return prev.filter(sel => sel._id !== exercicio._id);
      } else {
        return [...prev, exercicio];
      }
    });
  };

  const handleSubmitSelecao = () => {
    onExercisesSelect(exerciciosSelecionados);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterGrupoMuscular(ALL_FILTER_VALUE);
    setFilterCategoria(ALL_FILTER_VALUE);
  };

  // Extrai opções únicas para os filtros
  const gruposMusculares = useMemo(() => {
    const unique = new Set(exercicios.map(ex => ex.grupoMuscular).filter(Boolean) as string[]);
    return [ALL_FILTER_VALUE, ...Array.from(unique).sort()];
  }, [exercicios]);

  const categorias = useMemo(() => {
    const unique = new Set(exercicios.map(ex => ex.categoria).filter(Boolean) as string[]);
    return [ALL_FILTER_VALUE, ...Array.from(unique).sort()];
  }, [exercicios]);

  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Erro</DialogTitle>
            <DialogDescription>Ocorreu um erro ao carregar os exercícios: {error.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter><Button onClick={onClose}>Fechar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl flex flex-col h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4 border-b shrink-0">
          <DialogTitle>Selecionar Exercício(s) da Biblioteca</DialogTitle>
          <DialogDescription>
            Use as abas e filtros para encontrar e selecionar os exercícios.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 flex flex-col flex-grow overflow-hidden">
          <Tabs value={abaSelecionada} onValueChange={(v) => setAbaSelecionada(v as AbaBiblioteca)} className="mb-4 shrink-0">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="app">App</TabsTrigger>
              <TabsTrigger value="meus">Meus</TabsTrigger>
              <TabsTrigger value="favoritos">Favoritos</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Botão de filtro para mobile - sempre visível para expandir/recolher */}
          <div className="mb-4 shrink-0">
            <Button variant="outline" className="w-full" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="mr-2 h-4 w-4" />
              Filtros
              {showFilters ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
            </Button>
          </div>

          {/* Área de filtros - agora condicionalmente visível */}
          {showFilters && (
            <div className="space-y-3 mb-4 shrink-0">
              <Input
                placeholder="Buscar por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Select value={filterGrupoMuscular} onValueChange={setFilterGrupoMuscular}>
                <SelectTrigger><SelectValue placeholder="Todos os Grupos" /></SelectTrigger>
                <SelectContent>
                  {gruposMusculares.map(grupo => (
                    <SelectItem key={grupo} value={grupo}>{grupo === ALL_FILTER_VALUE ? "Todos os Grupos" : grupo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                <SelectTrigger><SelectValue placeholder="Todas as Categorias" /></SelectTrigger>
                <SelectContent>
                  {categorias.map(categoria => (
                    <SelectItem key={categoria} value={categoria}>{categoria === ALL_FILTER_VALUE ? "Todas as Categorias" : categoria}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(searchTerm || filterGrupoMuscular !== ALL_FILTER_VALUE || filterCategoria !== ALL_FILTER_VALUE) && (
                <Button variant="ghost" onClick={handleClearFilters} className="w-full text-red-500 hover:text-red-600">
                  <FilterX className="mr-2 h-4 w-4" />
                  Limpar Filtros
                </Button>
              )}
            </div>
          )}

          <ScrollArea className="flex-grow pr-4 -mr-4">
            {isLoading
              ? <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              : exerciciosFiltradosEOrdenados.length === 0 ? <p className="text-sm text-muted-foreground text-center py-10">Nenhum exercício encontrado.</p>
              : <div className="space-y-2">
                  {exerciciosFiltradosEOrdenados.map((ex) => {
                    const isSelected = exerciciosSelecionados.some(sel => sel._id === ex._id);
                    return (
                      <div
                        key={ex._id}
                        onClick={() => handleToggleSelecaoExercicio(ex)}
                        className={`p-3 border rounded-md cursor-pointer flex justify-between items-center transition-colors ${isSelected ? "bg-primary/10 border-primary ring-2 ring-primary" : "hover:bg-muted/50"}`}
                      >
                        <div>
                          <p className={`font-medium ${isSelected ? 'text-primary' : ''}`}>{ex.nome}</p>
                          <span className="text-xs text-muted-foreground">{ex.grupoMuscular || 'N/A'}</span>
                        </div>
                        {isSelected && <CheckCircle className="w-5 h-5 text-primary shrink-0" />}
                      </div>
                    );
                  })}
                </div>
            }
          </ScrollArea>
        </div>

        <DialogFooter className="p-6 pt-4 border-t shrink-0">
            <p className="text-sm text-muted-foreground mr-auto">{exerciciosSelecionados.length} selecionado(s)</p>
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSubmitSelecao} disabled={exerciciosSelecionados.length === 0}>Adicionar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
