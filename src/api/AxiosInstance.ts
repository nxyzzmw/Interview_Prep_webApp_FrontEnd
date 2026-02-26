const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || 'http://10.0.4.50:4029';

const loginEndpoint =
  (import.meta.env.VITE_LOGIN_ENDPOINT as string | undefined)?.trim() || '/auth/login';
const registerEndpoint =
  (import.meta.env.VITE_REGISTER_ENDPOINT as string | undefined)?.trim() || '/auth/register';
const questionsEndpoint =
  (import.meta.env.VITE_QUESTIONS_ENDPOINT as string | undefined)?.trim() || '/questions/';
const createQuestionEndpoint =
  (import.meta.env.VITE_CREATE_QUESTION_ENDPOINT as string | undefined)?.trim() || '/questions';
const updateQuestionEndpoint =
  (import.meta.env.VITE_UPDATE_QUESTION_ENDPOINT as string | undefined)?.trim() || '/questions/:id';
const deleteQuestionEndpoint =
  (import.meta.env.VITE_DELETE_QUESTION_ENDPOINT as string | undefined)?.trim() || '/questions/:id';
const progressPostEndpoint =
  (import.meta.env.VITE_PROGRESS_POST_ENDPOINT as string | undefined)?.trim() || '/progress/';
const progressPutEndpoint =
  (import.meta.env.VITE_PROGRESS_PUT_ENDPOINT as string | undefined)?.trim() || '/progress/:id';
const progressGetEndpoint =
  (import.meta.env.VITE_PROGRESS_GET_ENDPOINT as string | undefined)?.trim() || '/progress/:id';
const progressListEndpoint =
  (import.meta.env.VITE_PROGRESS_LIST_ENDPOINT as string | undefined)?.trim() || '/progress/';

export type UserRole = 'admin' | 'user';
export type ProgressStatus = 'pending' | 'attempted' | 'solved';

export type UserProfile = {
  name: string;
  email: string;
};

export type AuthSession = {
  token: string;
  role: UserRole;
  profile: UserProfile;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
};

export type LoginResponse = {
  accessToken?: string;
  token?: string;
  role?: UserRole;
  name?: string;
  email?: string;
  user?: {
    name?: string;
    email?: string;
    role?: string;
  };
  data?: {
    accessToken?: string;
    token?: string;
    role?: UserRole;
    name?: string;
    email?: string;
    user?: {
      name?: string;
      email?: string;
      role?: string;
    };
  };
  message?: string;
};

export type Question = {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  sampleInput: string;
  constraints: string;
  leetcodeUrl: string;
  status: ProgressStatus;
};

export type CreateQuestionPayload = {
  title: string;
  description: string;
  category: string;
  difficulty: string;
  sampleInputOutput: string;
  constraints: string;
  leetcodeUrl: string;
};

type QuestionsResponse =
  | Question[]
  | {
      data?: Question[];
      questions?: Question[];
      message?: string;
    };

type ProgressRecord = Record<string, unknown>;

type ProgressResponse =
  | ProgressRecord[]
  | {
      data?: ProgressRecord[] | ProgressRecord;
      progress?: ProgressRecord[] | ProgressRecord;
      message?: string;
      status?: unknown;
    };

function buildUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function buildUrlWithId(path: string, id: string): string {
  const normalizedPath = path
    .replace('questions:id', 'questions/:id')
    .replace('question:id', 'question/:id');

  const resolved = normalizedPath
    .replace(':id', encodeURIComponent(id))
    .replace('{id}', encodeURIComponent(id));

  return buildUrl(resolved);
}

async function safeJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

function toStatus(raw: unknown): ProgressStatus {
  const value = String(raw ?? '').toLowerCase();
  if (value === 'attempted') return 'attempted';
  if (value === 'solved' || value === 'completed') return 'solved';
  return 'pending';
}

function toRole(raw: unknown): UserRole {
  return String(raw ?? '').trim().toLowerCase() === 'admin' ? 'admin' : 'user';
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function extractIdLike(value: unknown): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number') return String(value);
  if (value && typeof value === 'object') {
    const record = value as ProgressRecord;
    return firstString(record.id, record._id, record.value, record.questionId, record.progressId);
  }
  return '';
}

function getProgressItems(body: ProgressResponse): ProgressRecord[] {
  if (Array.isArray(body)) {
    return body.filter((item): item is ProgressRecord => !!item && typeof item === 'object');
  }

  if (!body || typeof body !== 'object') return [];

  if (Array.isArray(body.data)) {
    return body.data.filter((item): item is ProgressRecord => !!item && typeof item === 'object');
  }

  if (Array.isArray(body.progress)) {
    return body.progress.filter((item): item is ProgressRecord => !!item && typeof item === 'object');
  }

  if (body.data && typeof body.data === 'object') {
    const dataRecord = body.data as ProgressRecord;
    if (Array.isArray(dataRecord.progress)) {
      return dataRecord.progress.filter((item): item is ProgressRecord => !!item && typeof item === 'object');
    }
    if (Array.isArray(dataRecord.items)) {
      return dataRecord.items.filter((item): item is ProgressRecord => !!item && typeof item === 'object');
    }
    if (Array.isArray(dataRecord.docs)) {
      return dataRecord.docs.filter((item): item is ProgressRecord => !!item && typeof item === 'object');
    }
    return [dataRecord];
  }
  if (body.progress && typeof body.progress === 'object') return [body.progress];
  if ('status' in body) return [body as ProgressRecord];

  return [];
}

function extractProgressQuestionId(record: ProgressRecord): string {
  const question =
    record.question && typeof record.question === 'object'
      ? (record.question as ProgressRecord)
      : null;

  return (
    extractIdLike(record.questionId) ||
    extractIdLike(record.question_id) ||
    extractIdLike(record.problemId) ||
    extractIdLike(record.problem_id) ||
    extractIdLike(question?.id) ||
    extractIdLike(question?._id) ||
    extractIdLike(question?.questionId)
  );
}

function extractProgressId(record: ProgressRecord): string {
  const data = record.data && typeof record.data === 'object' ? (record.data as ProgressRecord) : null;
  const progress =
    record.progress && typeof record.progress === 'object' ? (record.progress as ProgressRecord) : null;

  return (
    extractIdLike(record.id) ||
    extractIdLike(record._id) ||
    extractIdLike(record.progressId) ||
    extractIdLike(record.progress_id) ||
    extractIdLike(data?.id) ||
    extractIdLike(data?._id) ||
    extractIdLike(data?.progressId) ||
    extractIdLike(progress?.id) ||
    extractIdLike(progress?._id) ||
    extractIdLike(progress?.progressId)
  );
}

function normalizeQuestion(raw: Record<string, unknown>): Question {
  const id = extractIdLike(raw.id) || extractIdLike(raw._id) || extractIdLike(raw.questionId);

  const leetcodeRaw = firstString(
    raw.leetcodeUrl,
    raw.leetcode_url,
    raw.leetcodeLink,
    raw.leetCodeLink,
    raw.link,
    raw.problemLink,
    raw.problemUrl,
    raw.questionUrl,
    raw.url,
  );

  const leetcodeUrl = leetcodeRaw && !/^https?:\/\//i.test(leetcodeRaw) ? `https://${leetcodeRaw}` : leetcodeRaw;

  return {
    id,
    title: String(raw.title ?? ''),
    description: String(raw.description ?? ''),
    category: String(raw.category ?? ''),
    difficulty: String(raw.difficulty ?? ''),
    sampleInput: String(raw.sampleInput ?? raw.sample_input ?? raw.sampleInputOutput ?? raw.sample_input_output ?? ''),
    constraints: String(raw.constraints ?? raw.constraint ?? ''),
    leetcodeUrl,
    status: toStatus(raw.status ?? raw.userStatus),
  };
}

function resolveQuestions(body: QuestionsResponse): Question[] {
  const list: unknown[] = Array.isArray(body)
    ? body
    : Array.isArray(body.data)
      ? body.data
      : Array.isArray(body.questions)
        ? body.questions
        : [];

  return list
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map(normalizeQuestion);
}

async function getErrorMessage(response: Response): Promise<string> {
  const body = (await response.clone().json().catch(() => null)) as { message?: string } | null;
  if (body?.message) return body.message;
  const text = await response.text().catch(() => '');
  return text || `HTTP ${response.status}`;
}

export function extractAuthSession(response: LoginResponse, fallbackEmail = ''): AuthSession {
  const token =
    firstString(response.accessToken, response.token, response.data?.accessToken, response.data?.token) || '';

  if (!token) {
    throw new Error('Access token not found in backend response');
  }

  const role = toRole(response.role ?? response.data?.role ?? response.user?.role ?? response.data?.user?.role);
  const name =
    firstString(response.name, response.data?.name, response.user?.name, response.data?.user?.name) || 'User';
  const email = firstString(
    response.email,
    response.data?.email,
    response.user?.email,
    response.data?.user?.email,
    fallbackEmail,
  );

  return {
    token,
    role,
    profile: { name, email },
  };
}

export async function loginRequest(payload: LoginPayload): Promise<LoginResponse> {
  const response = await fetch(buildUrl(loginEndpoint), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const body = (await response.json().catch(() => ({}))) as LoginResponse;
  if (!response.ok) throw new Error(body.message || `Login failed (${response.status})`);
  return body;
}

export async function registerRequest(payload: RegisterPayload): Promise<LoginResponse> {
  const response = await fetch(buildUrl(registerEndpoint), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const body = (await response.json().catch(() => ({}))) as LoginResponse;
  if (!response.ok) throw new Error(body.message || `Register failed (${response.status})`);
  return body;
}

export async function fetchQuestions(token: string): Promise<Question[]> {
  const response = await fetch(buildUrl(questionsEndpoint), {
    headers: { Authorization: `Bearer ${token}` },
  });

  const body = (await response.json().catch(() => ({}))) as QuestionsResponse & { message?: string };
  if (!response.ok) throw new Error(body.message || `Failed to load questions (${response.status})`);
  return resolveQuestions(body);
}

export async function fetchQuestionProgressById(
  progressId: string,
  token: string,
): Promise<{ progressId: string; questionId: string; status: ProgressStatus } | null> {
  const response = await fetch(buildUrlWithId(progressGetEndpoint, progressId), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (response.status === 404) return null;

  const body = (await response.json().catch(() => ({}))) as ProgressResponse & { message?: string };
  if (!response.ok) throw new Error(body.message || `Failed to load progress (${response.status})`);

  const items = getProgressItems(body);
  const first = items[0];
  if (!first) return null;

  const questionId = extractProgressQuestionId(first);
  if (!questionId) return null;

  return {
    progressId: extractProgressId(first) || progressId,
    questionId,
    status: toStatus(first.status),
  };
}

export async function fetchAllQuestionProgress(token: string): Promise<{
  statusByQuestionId: Record<string, ProgressStatus>;
  progressIdByQuestionId: Record<string, string>;
}> {
  const response = await fetch(buildUrl(progressListEndpoint), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`${await getErrorMessage(response)} (GET ${buildUrl(progressListEndpoint)})`);
  }

  const body = (await response.json().catch(() => ({}))) as ProgressResponse;
  const items = getProgressItems(body);
  const statusByQuestionId: Record<string, ProgressStatus> = {};
  const progressIdByQuestionId: Record<string, string> = {};

  for (const item of items) {
    const questionId = extractProgressQuestionId(item);
    if (!questionId) continue;
    statusByQuestionId[questionId] = toStatus(item.status);
    const pid = extractProgressId(item);
    if (pid) progressIdByQuestionId[questionId] = pid;
  }

  return { statusByQuestionId, progressIdByQuestionId };
}

export async function createQuestion(payload: CreateQuestionPayload, token: string): Promise<void> {
  const url = buildUrl(createQuestionEndpoint);
  const difficulty = payload.difficulty.trim().toLowerCase();
  const category = payload.category.trim().toLowerCase();

  // Keep a few aliases for backend compatibility.
  const body = {
    title: payload.title,
    description: payload.description,
    category,
    difficulty,
    level: difficulty,
    sampleInputOutput: payload.sampleInputOutput,
    sampleInput: payload.sampleInputOutput,
    sample_input: payload.sampleInputOutput,
    constraints: payload.constraints,
    leetcodeUrl: payload.leetcodeUrl,
    link: payload.leetcodeUrl,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`${await getErrorMessage(response)} (POST ${url})`);
  }
}

export async function updateQuestion(questionId: string, payload: CreateQuestionPayload, token: string): Promise<void> {
  const url = buildUrlWithId(updateQuestionEndpoint, questionId);

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: payload.title,
      description: payload.description,
      category: payload.category.trim().toLowerCase(),
      difficulty: payload.difficulty.trim().toLowerCase(),
      sampleInputOutput: payload.sampleInputOutput,
      constraints: payload.constraints,
      leetcodeUrl: payload.leetcodeUrl,
    }),
  });

  if (!response.ok) {
    throw new Error(`${await getErrorMessage(response)} (PUT ${url})`);
  }
}

export async function deleteQuestion(questionId: string, token: string): Promise<void> {
  const url = buildUrlWithId(deleteQuestionEndpoint, questionId);

  const response = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`${await getErrorMessage(response)} (DELETE ${url})`);
  }
}

export async function markQuestionAttempted(questionId: string, token: string): Promise<string | null> {
  const url = buildUrl(progressPostEndpoint);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ questionId, status: 'attempted' }),
  });

  if (!response.ok) {
    throw new Error(`${await getErrorMessage(response)} (POST ${url})`);
  }

  const body = await safeJson(response);
  const progressId = extractProgressId(body);
  return progressId || null;
}

export async function markQuestionSolved(progressId: string, questionId: string, token: string): Promise<void> {
  const url = buildUrlWithId(progressPutEndpoint, progressId);

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ questionId, status: 'solved' }),
  });

  if (!response.ok) {
    throw new Error(`${await getErrorMessage(response)} (PUT ${url})`);
  }
}

export async function markQuestionUnsolved(progressId: string, questionId: string, token: string): Promise<void> {
  const url = buildUrlWithId(progressPutEndpoint, progressId);

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ questionId, status: 'attempted' }),
  });

  if (!response.ok) {
    throw new Error(`${await getErrorMessage(response)} (PUT ${url})`);
  }
}
