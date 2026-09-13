/**
 * Roles a candidate can target. `skills` drives the fallback (non-AI)
 * resume analyzer's keyword matching — it's intentionally a flat list of
 * terms likely to appear verbatim on a resume rather than a taxonomy.
 * `isAdvanced` gates the System Design round, which only makes sense for
 * roles that own architecture decisions.
 */
const ROLES = [
  {
    id: "sde",
    name: "Software Development Engineer",
    category: "Engineering",
    isAdvanced: true,
    skills: [
      "Data Structures", "Algorithms", "System Design", "Java", "Python",
      "C++", "SQL", "Git", "Object-Oriented Programming", "REST API",
    ],
  },
  {
    id: "frontend",
    isAdvanced: false,
    name: "Frontend Developer",
    category: "Engineering",
    skills: [
      "JavaScript", "React", "HTML", "CSS", "TypeScript", "Redux",
      "Responsive Design", "REST API", "Git", "Webpack",
    ],
  },
  {
    id: "backend",
    isAdvanced: true,
    name: "Backend Developer",
    category: "Engineering",
    skills: [
      "Node.js", "Java", "Python", "SQL", "MongoDB", "REST API",
      "System Design", "Microservices", "Git", "Docker",
    ],
  },
  {
    id: "fullstack",
    isAdvanced: true,
    name: "Full Stack Developer",
    category: "Engineering",
    skills: [
      "JavaScript", "React", "Node.js", "SQL", "MongoDB", "REST API",
      "HTML", "CSS", "Git", "System Design",
    ],
  },
  {
    id: "data-analyst",
    isAdvanced: false,
    name: "Data Analyst",
    category: "Data",
    skills: [
      "SQL", "Excel", "Python", "Data Visualization", "Statistics",
      "Power BI", "Tableau", "A/B Testing", "Pandas", "R",
    ],
  },
  {
    id: "data-scientist",
    isAdvanced: true,
    name: "Data Scientist",
    category: "Data",
    skills: [
      "Python", "Machine Learning", "Statistics", "SQL", "Pandas",
      "NumPy", "Deep Learning", "Data Visualization", "Scikit-learn", "R",
    ],
  },
  {
    id: "devops",
    isAdvanced: true,
    name: "DevOps Engineer",
    category: "Infrastructure",
    skills: [
      "Linux", "Docker", "Kubernetes", "CI/CD", "AWS", "Git", "Networking",
      "Shell Scripting", "Terraform", "Jenkins",
    ],
  },
  {
    id: "qa",
    isAdvanced: false,
    name: "QA / Test Engineer",
    category: "Engineering",
    skills: [
      "Manual Testing", "Automation Testing", "Selenium", "Test Cases",
      "SQL", "Bug Tracking", "API Testing", "JIRA", "Postman", "Java",
    ],
  },
];

module.exports = ROLES;
