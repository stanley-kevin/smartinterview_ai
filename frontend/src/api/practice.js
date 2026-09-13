import api from "./axios";

export const getRoles = () => api.get("/roles").then((r) => r.data.roles);

export const getRounds = () => api.get("/rounds").then((r) => r.data.rounds);

export const getPracticeRounds = (role) =>
  api.get(`/rounds/for-role?role=${encodeURIComponent(role)}`).then((r) => r.data.rounds);

export const getCompanyRounds = (slug, role) =>
  api.get(`/companies/${slug}/rounds?role=${encodeURIComponent(role)}`).then((r) => r.data.rounds);

export const getCompanies = () => api.get("/companies").then((r) => r.data.companies);

export const getDashboard = () => api.get("/dashboard").then((r) => r.data);

export const analyzeResume = ({ file, role, mode, company }) => {
  const form = new FormData();
  form.append("resume", file);
  form.append("role", role);
  form.append("mode", mode);
  if (company) form.append("company", company);
  return api
    .post("/resume/analyze", form, { headers: { "Content-Type": "multipart/form-data" } })
    .then((r) => r.data.attempt);
};

export const startAptitude = ({ role, mode, company }) =>
  api.post("/aptitude/start", { role, mode, company }).then((r) => r.data);

export const submitAptitude = (attemptId, payload) =>
  api.post(`/aptitude/${attemptId}/submit`, payload).then((r) => r.data);

export const startTechnicalMcq = ({ role, mode, company }) =>
  api.post("/technical-mcq/start", { role, mode, company }).then((r) => r.data);

export const submitTechnicalMcq = (attemptId, payload) =>
  api.post(`/technical-mcq/${attemptId}/submit`, payload).then((r) => r.data);

// --- Group Discussion (GD) ---
export const startGD = ({ role, mode, company }) =>
  api.post("/rounds/gd/start", { role, mode, company }).then((r) => r.data);

export const turnGD = ({ attemptId, userText }) =>
  api.post("/rounds/gd/turn", { attemptId, userText }).then((r) => r.data);

export const scoreGD = ({ attemptId }) =>
  api.post("/rounds/gd/score", { attemptId }).then((r) => r.data);

// --- Coding Round ---
export const startCoding = ({ role, mode, company }) =>
  api.post("/rounds/coding/start", { role, mode, company }).then((r) => r.data);

export const runCoding = ({ attemptId, code, language }) =>
  api.post("/rounds/coding/run", { attemptId, code, language }).then((r) => r.data);

export const submitCoding = ({ attemptId, code, language }) =>
  api.post("/rounds/coding/submit", { attemptId, code, language }).then((r) => r.data);

// --- Technical Interview Round ---
export const startTechnicalInterview = ({ role, mode, company }) =>
  api.post("/rounds/technical-interview/start", { role, mode, company }).then((r) => r.data);

export const turnTechnicalInterview = ({ attemptId, userText }) =>
  api.post("/rounds/technical-interview/turn", { attemptId, userText }).then((r) => r.data);

export const scoreTechnicalInterview = ({ attemptId }) =>
  api.post("/rounds/technical-interview/score", { attemptId }).then((r) => r.data);

// --- System Design Round ---
export const startSystemDesign = ({ role, mode, company }) =>
  api.post("/rounds/system-design/start", { role, mode, company }).then((r) => r.data);

export const turnSystemDesign = ({ attemptId, diagram, userExplanation }) =>
  api.post("/rounds/system-design/turn", { attemptId, diagram, userExplanation }).then((r) => r.data);

export const scoreSystemDesign = ({ attemptId, finalDiagram }) =>
  api.post("/rounds/system-design/score", { attemptId, finalDiagram }).then((r) => r.data);

// --- Behavioral / HR Round ---
export const startHR = ({ role, mode, company }) =>
  api.post("/rounds/hr/start", { role, mode, company }).then((r) => r.data);

export const answerHR = ({ attemptId, questionId, answerText }) =>
  api.post("/rounds/hr/answer", { attemptId, questionId, answerText }).then((r) => r.data);

export const scoreHR = ({ attemptId }) =>
  api.post("/rounds/hr/score", { attemptId }).then((r) => r.data);


