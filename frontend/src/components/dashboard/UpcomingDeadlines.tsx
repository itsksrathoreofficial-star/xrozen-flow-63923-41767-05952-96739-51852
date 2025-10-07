import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, AlertTriangle } from "lucide-react";
import { format, differenceInDays, isPast, isFuture } from "date-fns";

interface Project {
  id: string;
  name: string;
  deadline: string;
  status: string;
}

export function UpcomingDeadlines() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeadlines();
  }, []);

  const loadDeadlines = async () => {
    try {
      const user = await apiClient.getCurrentUser();
      if (!user) return;

      const projectsData = await apiClient.getProjects();
      if (projectsData) {
        const projectsWithDeadlines = projectsData
          .filter(project => project.deadline && project.status !== 'completed')
          .map(project => ({
            id: project.id,
            name: project.title,
            deadline: project.deadline,
            status: project.status
          }))
          .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

        setProjects(projectsWithDeadlines.slice(0, 10));
      }
    } catch (error) {
      console.error('Error loading deadlines:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDeadlineStatus = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const daysRemaining = differenceInDays(deadlineDate, new Date());

    if (isPast(deadlineDate)) {
      return { label: 'Overdue', variant: 'destructive' as const, days: Math.abs(daysRemaining) };
    } else if (daysRemaining <= 3) {
      return { label: 'Due Soon', variant: 'warning' as const, days: daysRemaining };
    } else {
      return { label: 'Upcoming', variant: 'default' as const, days: daysRemaining };
    }
  };

  if (loading) {
    return (
      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-elegant">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Upcoming Deadlines
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {projects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No upcoming deadlines</p>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => {
                const deadlineStatus = getDeadlineStatus(project.deadline);
                return (
                  <div
                    key={project.id}
                    className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium">{project.name}</h4>
                      <Badge variant={deadlineStatus.variant === 'warning' ? 'destructive' : deadlineStatus.variant}>
                        {deadlineStatus.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(project.deadline), 'MMM dd, yyyy')}
                      </div>
                      <div className="flex items-center gap-1">
                        {isPast(new Date(project.deadline)) ? (
                          <>
                            <AlertTriangle className="h-3 w-3 text-destructive" />
                            <span className="text-destructive">
                              {deadlineStatus.days} days overdue
                            </span>
                          </>
                        ) : (
                          <span>
                            {deadlineStatus.days} days remaining
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className="mt-2">
                      {project.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
