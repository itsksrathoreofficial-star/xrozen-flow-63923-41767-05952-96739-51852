import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Video, Plus } from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/database-config";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ProjectsTable } from "@/components/projects/ProjectsTable";
import { ProjectFormDialog } from "@/components/projects/ProjectFormDialog";
import { ProjectSearch } from "@/components/projects/ProjectSearch";

const Projects = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [editors, setEditors] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [parentProjectId, setParentProjectId] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
    loadEditors();
    loadClients();
  }, []);

  const loadProjects = async () => {
    try {
      // Check authentication first
      if (!apiClient.isAuthenticated()) {
        console.log('🔧 Projects: Not authenticated, redirecting');
        navigate("/auth");
        return;
      }

      const user = await apiClient.getCurrentUser();
      if (!user) {
        console.log('🔧 Projects: No user data, redirecting to auth');
        navigate("/auth");
        return;
      }

      const projectsData = await apiClient.getProjects();
      setProjects(projectsData || []);
      console.log('🔧 Projects: Projects loaded successfully');
    } catch (error: any) {
      console.error('🔧 Projects: Error loading projects:', error);
      if (error.message?.includes('Unauthorized') || error.message?.includes('401')) {
        console.log('🔧 Projects: Auth error, redirecting to login');
        navigate("/auth");
      } else {
        toast.error("Failed to load projects");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadEditors = async () => {
    if (!apiClient.isAuthenticated()) {
      console.log('🔧 Projects: Not authenticated, skipping editors load');
      return;
    }
    
    try {
      const editorsData = await apiClient.getEditors();
      setEditors(editorsData || []);
      console.log('🔧 Projects: Editors loaded successfully');
    } catch (error) {
      console.error("🔧 Projects: Error loading editors:", error);
      // Don't redirect for secondary data loading failures
    }
  };

  const loadClients = async () => {
    if (!apiClient.isAuthenticated()) {
      console.log('🔧 Projects: Not authenticated, skipping clients load');
      return;
    }
    
    try {
      const clientsData = await apiClient.getClients();
      setClients(clientsData || []);
      console.log('🔧 Projects: Clients loaded successfully');
    } catch (error) {
      console.error("🔧 Projects: Error loading clients:", error);
      // Don't redirect for secondary data loading failures
    }
  };

  const handleCreateProject = async (formData: any) => {
    try {
      const user = await apiClient.getCurrentUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      if (editingProject) {
        await apiClient.updateProject(editingProject.id, formData);
        toast.success("Project updated successfully!");
      } else {
        await apiClient.createProject({
          ...formData,
          creator_id: user.id
        });
        toast.success("Project created successfully!");
      }

      setDialogOpen(false);
      setEditingProject(null);
      setParentProjectId(null);
      loadProjects();
    } catch (error: any) {
      toast.error("Failed to save project");
    }
  };

  const handleEdit = (project: any) => {
    setEditingProject(project);
    setParentProjectId(null);
    setDialogOpen(true);
  };

  const handleAddSubProject = (parentId: string) => {
    setParentProjectId(parentId);
    setEditingProject(null);
    setDialogOpen(true);
  };

  const handleDelete = async (projectId: string) => {
    try {
      await apiClient.deleteProject(projectId);
      setProjects(projects.filter(p => p.id !== projectId));
      toast.success("Project deleted successfully");
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Failed to delete project");
    }
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingProject(null);
      setParentProjectId(null);
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedProjects = useMemo(() => {
    let filtered = projects;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(query) ||
        project.project_type?.toLowerCase().includes(query) ||
        project.status.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query)
      );
    }

    // Sort
    if (sortConfig) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortConfig.key] || '';
        const bValue = b[sortConfig.key] || '';
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [projects, searchQuery, sortConfig]);

  const handleProjectClick = (projectId: string) => {
    navigate(`/projects/${projectId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen">
        <AppSidebar />
        <div className="flex-1 bg-gradient-to-br from-background via-primary/5 to-success/5">
          <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
            <div className="flex items-center justify-between px-6 py-4 gap-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-glow">
                    <Video className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <h1 className="text-xl font-bold">Projects</h1>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <ProjectSearch onSearch={setSearchQuery} />
                <Button className="gradient-primary" onClick={() => setDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </Button>
              </div>
            </div>
          </header>

          <main className="px-8 py-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2">Your Projects</h2>
              <p className="text-muted-foreground">
                Manage your video editing projects and track progress. Search, sort, and organize with sub-projects.
              </p>
            </div>

            <ProjectsTable
              projects={filteredAndSortedProjects}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAddSubProject={handleAddSubProject}
              onProjectClick={handleProjectClick}
              sortConfig={sortConfig}
              onSort={handleSort}
            />

            <ProjectFormDialog
              open={dialogOpen}
              onOpenChange={handleDialogClose}
              editingProject={editingProject}
              onSubmit={handleCreateProject}
              editors={editors}
              clients={clients}
              parentProjectId={parentProjectId}
            />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Projects;
