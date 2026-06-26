import { Task } from "./types";

export const getSeedTasks = (userId: string): Omit<Task, "id">[] => {
  const now = new Date();

  // Helper to get dynamic date string
  const getRelativeISO = (hoursOffset: number) => {
    const d = new Date(now.getTime() + hoursOffset * 60 * 60 * 1000);
    // Format to YYYY-MM-DDTHH:mm
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  return [
    {
      userId,
      title: "CS401 Final Machine Learning Project Submission",
      description: "Submit final report, GitHub code link, and YouTube video demonstration. Requires training curves and fine-tuning results.",
      deadline: getRelativeISO(4), // Due in 4 hours (Extremely high risk - needs 6 hours of work!)
      estimatedHours: 6,
      category: "Assignment",
      priority: "High",
      completed: false,
      createdAt: now.toISOString(),
    },
    {
      userId,
      title: "Google Cloud Platform Annual Hosting Renewal",
      description: "Pay the staging server bill to avoid database termination and container service suspension. Verify payment method.",
      deadline: getRelativeISO(8), // Due in 8 hours (Urgent Bill)
      estimatedHours: 0.5,
      category: "Bill",
      priority: "High",
      completed: false,
      createdAt: now.toISOString(),
    },
    {
      userId,
      title: "Google Technical Prep & Portfolio Review",
      description: "Prepare presentation slides, brush up on system design topics, and review core API optimization questions for tomorrow's round.",
      deadline: getRelativeISO(26), // Due tomorrow (At Risk - needs 4 hours of prep)
      estimatedHours: 4,
      category: "Interview",
      priority: "High",
      completed: false,
      createdAt: now.toISOString(),
    },
    {
      userId,
      title: "Weekly Synchronous Sprint Planning Sync",
      description: "Check in with the engineering and design leads. Present milestone achievements and blockages.",
      deadline: getRelativeISO(-2), // Overdue by 2 hours
      estimatedHours: 1,
      category: "Meeting",
      priority: "Medium",
      completed: false,
      createdAt: now.toISOString(),
    },
    {
      userId,
      title: "Review Design System & UI Assets",
      description: "Look over the Figma prototype and export asset PNGs for developer handoff. Add comments on spacing and typography.",
      deadline: getRelativeISO(48), // Due in 2 days
      estimatedHours: 2,
      category: "Other",
      priority: "Low",
      completed: false,
      createdAt: now.toISOString(),
    },
  ];
};
