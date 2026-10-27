import { useState } from 'react';
import type { TaskDto, CreateTaskDto, TaskStatusType } from './types/task.types';
import { Button, Card, Badge } from './components/common';
import { TaskForm, TaskCard } from './components/tasks';
import './App.css';

type FilterType = 'All' | TaskStatusType;

function App() {
  // ZERO SEED DATA: State starts empty, ready for real user interaction
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [filter, setFilter] = useState<FilterType>('All');

  // Lifting State Up: Handler passed to child TaskForm
  const handleAddTask = (newTaskDto: CreateTaskDto) => {
    const newTask: TaskDto = {
      id: Date.now(),
      title: newTaskDto.title,
      description: newTaskDto.description || null,
      status: newTaskDto.status,
      priority: newTaskDto.priority,
      projectId: newTaskDto.projectId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setTasks((prev) => [newTask, ...prev]);
  };

  // Cycle status: Todo -> InProgress -> Done -> Todo
  const handleToggleStatus = (id: number) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        let nextStatus: TaskStatusType;
        if (t.status === 'Todo') nextStatus = 'InProgress';
        else if (t.status === 'InProgress') nextStatus = 'Done';
        else nextStatus = 'Todo';

        return { ...t, status: nextStatus, updatedAt: new Date().toISOString() };
      })
    );
  };

  // Delete task by ID
  const handleDeleteTask = (id: number) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  // Filtered task collection
  const filteredTasks = tasks.filter((t) => (filter === 'All' ? true : t.status === filter));

  // Dynamic statistics counters
  const totalCount = tasks.length;
  const todoCount = tasks.filter((t) => t.status === 'Todo').length;
  const inProgressCount = tasks.filter((t) => t.status === 'InProgress').length;
  const doneCount = tasks.filter((t) => t.status === 'Done').length;

  return (
    <div className="appContainer">
      <header className="header">
        <div className="brandRow">
          <h1 className="mainTitle">DevTaskHub</h1>
          <Badge variant="purple">Aashutosh</Badge>
        </div>
        <p className="tagline">Developer Task Console &amp; GitHub Workspace</p>
      </header>

      {/* Dynamic Summary Cards */}
      <section className="statsGrid">
        <Card className="statCard">
          <span className="statValue">{totalCount}</span>
          <span className="statLabel">Total Tasks</span>
        </Card>
        <Card className="statCard">
          <span className="statValue">{todoCount}</span>
          <span className="statLabel">Todo</span>
        </Card>
        <Card className="statCard">
          <span className="statValue">{inProgressCount}</span>
          <span className="statLabel">In Progress</span>
        </Card>
        <Card className="statCard">
          <span className="statValue">{doneCount}</span>
          <span className="statLabel">Completed</span>
        </Card>
      </section>

      {/* Controlled Form */}
      <TaskForm onAddTask={handleAddTask} />

      {/* Filter Bar */}
      <div className="filterBar">
        <div className="filterPills">
          <Button
            size="sm"
            variant={filter === 'All' ? 'primary' : 'secondary'}
            onClick={() => setFilter('All')}
          >
            All ({totalCount})
          </Button>
          <Button
            size="sm"
            variant={filter === 'Todo' ? 'primary' : 'secondary'}
            onClick={() => setFilter('Todo')}
          >
            Todo ({todoCount})
          </Button>
          <Button
            size="sm"
            variant={filter === 'InProgress' ? 'primary' : 'secondary'}
            onClick={() => setFilter('InProgress')}
          >
            In Progress ({inProgressCount})
          </Button>
          <Button
            size="sm"
            variant={filter === 'Done' ? 'primary' : 'secondary'}
            onClick={() => setFilter('Done')}
          >
            Done ({doneCount})
          </Button>
        </div>
        <Badge variant="neutral">
          Showing {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'}
        </Badge>
      </div>

      {/* Empty State or Task Grid */}
      {filteredTasks.length === 0 ? (
        <Card className="emptyState">
          <h3 className="emptyTitle">No Tasks Yet</h3>
          <p className="emptyText">
            {tasks.length === 0
              ? 'Your developer console is clear. Create your first DevTask using the form above!'
              : `No tasks matching the "${filter}" filter.`}
          </p>
        </Card>
      ) : (
        <main className="tasksGrid">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDeleteTask}
            />
          ))}
        </main>
      )}
    </div>
  );
}

export default App;