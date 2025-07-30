import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StudentCard from "@/components/ui/student-card";
import { Aluno } from "@/types/aluno";
import {
  Users,
  UserCheck,
  UserX,
  BarChart3,
  Eye,
  Trash2,
  TrendingUp,
} from "lucide-react";

// Mock data for demonstration
const mockStudents: Aluno[] = [
  {
    _id: "1",
    nome: "Ana Silva",
    email: "ana.silva@email.com",
    phone: "(11) 99999-1111",
    birthDate: "1990-03-15",
    gender: "Feminino",
    goal: "Perda de peso",
    weight: 65,
    height: 165,
    startDate: "2024-01-15",
    status: "active",
    notes: "Muito dedicada aos treinos",
    trainerId: "trainer1"
  },
  {
    _id: "2",
    nome: "João Santos",
    email: "joao.santos@email.com",
    phone: "(11) 99999-2222",
    birthDate: "1985-07-22",
    gender: "Masculino",
    goal: "Ganho de massa muscular",
    weight: 80,
    height: 180,
    startDate: "2024-02-01",
    status: "active",
    notes: "Foco em hipertrofia",
    trainerId: "trainer1"
  },
  {
    _id: "3",
    nome: "Maria Oliveira",
    email: "maria.oliveira@email.com",
    phone: "(11) 99999-3333",
    birthDate: "1992-11-08",
    gender: "Feminino",
    goal: "Condicionamento físico",
    weight: 58,
    height: 160,
    startDate: "2023-12-10",
    status: "active",
    notes: "Treinos funcionais",
    trainerId: "trainer1"
  },
  {
    _id: "4",
    nome: "Pedro Costa",
    email: "pedro.costa@email.com",
    phone: "(11) 99999-4444",
    birthDate: "1988-05-12",
    gender: "Masculino",
    goal: "Reabilitação",
    weight: 75,
    height: 175,
    startDate: "2024-03-01",
    status: "inactive",
    notes: "Afastado temporariamente",
    trainerId: "trainer1"
  },
  {
    _id: "5",
    nome: "Carla Mendes",
    email: "carla.mendes@email.com",
    phone: "(11) 99999-5555",
    birthDate: "1995-09-18",
    gender: "Feminino",
    goal: "Definição muscular",
    weight: 62,
    height: 168,
    startDate: "2024-01-22",
    status: "active",
    notes: "Treinos de força",
    trainerId: "trainer1"
  },
  {
    _id: "6",
    nome: "Ricardo Lima",
    email: "ricardo.lima@email.com",
    phone: "(11) 99999-6666",
    birthDate: "1983-12-03",
    gender: "Masculino",
    goal: "Perda de peso",
    weight: 95,
    height: 185,
    startDate: "2023-11-15",
    status: "active",
    notes: "Combinação cardio e musculação",
    trainerId: "trainer1"
  }
];

// Statistics Card Component
const StatsCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color = "blue",
  change,
  changeType = "neutral"
}: { 
  title: string; 
  value: number; 
  icon: React.ElementType; 
  color?: "blue" | "green" | "red" | "purple";
  change?: string;
  changeType?: "up" | "down" | "neutral";
}) => {
  const colorClasses = {
    blue: "from-blue-500/10 to-blue-600/10 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400",
    green: "from-green-500/10 to-green-600/10 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400",
    red: "from-red-500/10 to-red-600/10 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400",
    purple: "from-purple-500/10 to-purple-600/10 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400",
  };

  const changeColors = {
    up: "text-green-600 dark:text-green-400",
    down: "text-red-600 dark:text-red-400", 
    neutral: "text-gray-500 dark:text-gray-400",
  };

  return (
    <Card className={`bg-gradient-to-br border transition-all duration-200 hover:shadow-lg hover:scale-105 ${colorClasses[color]}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {title}
        </CardTitle>
        <Icon className="h-5 w-5" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
          {value.toLocaleString()}
        </div>
        {change && (
          <div className={`flex items-center text-xs ${changeColors[changeType]}`}>
            <TrendingUp className="h-3 w-3 mr-1" />
            {change}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function StudentsDemo() {
  const activeStudents = mockStudents.filter(s => s.status === 'active').length;
  const inactiveStudents = mockStudents.filter(s => s.status === 'inactive').length;
  const total = mockStudents.length;
  const activityRate = Math.round((activeStudents / total) * 100);

  const handleView = (student: Aluno) => {
    alert(`Visualizar aluno: ${student.nome}`);
  };

  const handleDelete = (student: Aluno) => {
    alert(`Remover aluno: ${student.nome}`);
  };

  const handleStatusToggle = (student: Aluno) => {
    alert(`Alterar status do aluno: ${student.nome}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="p-4 md:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Demo - Gerenciar Alunos
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Demonstração da nova interface moderna para gerenciamento de alunos
              </p>
            </div>
            <div className="flex items-center space-x-2 mt-4 sm:mt-0">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                ✨ Nova Interface
              </Badge>
            </div>
          </div>

          {/* Statistics Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatsCard
              title="Total de Alunos"
              value={total}
              icon={Users}
              color="blue"
              change="+2 este mês"
              changeType="up"
            />
            <StatsCard
              title="Alunos Ativos"
              value={activeStudents}
              icon={UserCheck}
              color="green"
              change="+5 esta semana"
              changeType="up"
            />
            <StatsCard
              title="Alunos Inativos"
              value={inactiveStudents}
              icon={UserX}
              color="red"
              change="-1 esta semana"
              changeType="down"
            />
            <StatsCard
              title="Taxa de Atividade"
              value={activityRate}
              icon={BarChart3}
              color="purple"
              change="Estável"
              changeType="neutral"
            />
          </div>
        </div>

        {/* Modern Student Cards */}
        <Card className="mb-6 shadow-sm bg-white dark:bg-gray-900">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Alunos Cadastrados</span>
              <Badge variant="secondary">{total} alunos</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {mockStudents.map((student) => (
                <StudentCard
                  key={student._id}
                  student={student}
                  onView={handleView}
                  onDelete={handleDelete}
                  onStatusToggle={handleStatusToggle}
                  showProgress={true}
                  showDetails={true}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Features List */}
        <Card className="bg-white dark:bg-gray-900">
          <CardHeader>
            <CardTitle>✨ Novas Funcionalidades Implementadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  🎨 Interface Moderna
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Cards elegantes com gradientes, hover effects e micro-interações
                </p>
              </div>
              <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-lg">
                <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                  📊 Dashboard de Estatísticas
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Métricas em tempo real com indicadores visuais e tendências
                </p>
              </div>
              <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-lg">
                <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                  🔍 Busca Avançada
                </h3>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  Filtros por status, objetivo e pesquisa inteligente
                </p>
              </div>
              <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 rounded-lg">
                <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">
                  📱 Design Responsivo
                </h3>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  Adaptação perfeita para mobile, tablet e desktop
                </p>
              </div>
              <div className="p-4 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 rounded-lg">
                <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                  ⚡ Performance Otimizada
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Cache inteligente e updates otimistas para melhor UX
                </p>
              </div>
              <div className="p-4 bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-indigo-950 dark:to-indigo-900 rounded-lg">
                <h3 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-2">
                  🎯 Indicadores Visuais
                </h3>
                <p className="text-sm text-indigo-700 dark:text-indigo-300">
                  Progress bars, status badges e feedback visual
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}