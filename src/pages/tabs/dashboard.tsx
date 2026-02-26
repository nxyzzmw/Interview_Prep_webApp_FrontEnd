import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  createQuestion,
  deleteQuestion,
  fetchAllQuestionProgress,
  fetchQuestionProgressById,
  fetchQuestions,
  markQuestionAttempted,
  markQuestionUnsolved,
  markQuestionSolved,
  type CreateQuestionPayload,
  type Question,
  updateQuestion,
} from '../../api/AxiosInstance';

type DashboardProps = {
  role: string;
  token: string | null;
  name: string;
};

const emptyQuestion: CreateQuestionPayload = {
  title: '',
  description: '',
  category: 'DSA',
  difficulty: 'EASY',
  sampleInputOutput: '',
  constraints: '',
  leetcodeUrl: '',
};
const PROGRESS_ID_MAP_KEY = 'progressIdByQuestionId';

const Dashboard = ({ role, token, name }: DashboardProps) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isCreatingQuestion, setIsCreatingQuestion] = useState(false);
  const [newQuestion, setNewQuestion] = useState<CreateQuestionPayload>(emptyQuestion);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [activeStatusQuestionId, setActiveStatusQuestionId] = useState<string | null>(null);
  const [activeDeleteQuestionId, setActiveDeleteQuestionId] = useState<string | null>(null);
  const [progressIdByQuestionId, setProgressIdByQuestionId] = useState<Record<string, string>>(() => {
    const raw = localStorage.getItem(PROGRESS_ID_MAP_KEY);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw) as Record<string, string>;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(PROGRESS_ID_MAP_KEY, JSON.stringify(progressIdByQuestionId));
  }, [progressIdByQuestionId]);

  const loadQuestions = async () => {
    if (!token) return;

    setLoading(true);
    setError('');

    try {
      const questionResponse = await fetchQuestions(token);
      const statusByQuestionId: Record<string, Question['status']> = {};
      const refreshedProgressMap: Record<string, string> = {};

      const allProgress = await fetchAllQuestionProgress(token).catch(() => null);
      if (allProgress) {
        Object.assign(statusByQuestionId, allProgress.statusByQuestionId);
        Object.assign(refreshedProgressMap, allProgress.progressIdByQuestionId);
      }

      await Promise.all(
        Object.entries({ ...progressIdByQuestionId, ...refreshedProgressMap }).map(async ([questionId, progressId]) => {
          if (statusByQuestionId[questionId]) return;
          const progress = await fetchQuestionProgressById(progressId, token).catch(() => null);
          if (!progress) return;
          const resolvedQuestionId = progress.questionId || questionId;
          statusByQuestionId[resolvedQuestionId] = progress.status;
          refreshedProgressMap[resolvedQuestionId] = progress.progressId;
        }),
      );

      setProgressIdByQuestionId((prev) => ({ ...prev, ...refreshedProgressMap }));
      const mergedQuestions = questionResponse.map((question) => ({
        ...question,
        status: statusByQuestionId[question.id] || question.status || 'pending',
      }));
      setQuestions(mergedQuestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadQuestions();
  }, [token]);

  const normalizedRole = role.trim().toLowerCase();
  const isAdmin = normalizedRole === 'admin';

  const handleCreateQuestion = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    const title = newQuestion.title.trim();
    const description = newQuestion.description.trim();
    const category = newQuestion.category.trim();
    const difficulty = newQuestion.difficulty.trim();
    const sampleInputOutput = newQuestion.sampleInputOutput.trim();
    const constraints = newQuestion.constraints.trim();
    const leetcodeUrl = newQuestion.leetcodeUrl.trim();

    if (!title || !description || !sampleInputOutput || !constraints || !leetcodeUrl) {
      setError('All fields are required.');
      return;
    }

    if (!['DSA', 'SQL'].includes(category)) {
      setError('Category must be DSA or SQL.');
      return;
    }

    if (!['EASY', 'MEDIUM', 'HARD'].includes(difficulty)) {
      setError('Difficulty must be EASY, MEDIUM, or HARD.');
      return;
    }

    try {
      const parsedUrl = new URL(leetcodeUrl);
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        setError('LeetCode link must be a valid http/https URL.');
        return;
      }
    } catch {
      setError('LeetCode link must be a valid URL.');
      return;
    }

    setIsCreatingQuestion(true);
    setError('');
    setSuccessMessage('');

    try {
      const payload = {
        title,
        description,
        category,
        difficulty,
        sampleInputOutput,
        constraints,
        leetcodeUrl,
      };

      if (editingQuestionId) {
        await updateQuestion(editingQuestionId, payload, token);
        setSuccessMessage('Question updated successfully.');
      } else {
        await createQuestion(payload, token);
        setSuccessMessage('Question created successfully.');
      }

      setShowAddModal(false);
      setEditingQuestionId(null);
      setNewQuestion(emptyQuestion);
      await loadQuestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create question');
    } finally {
      setIsCreatingQuestion(false);
    }
  };

  const openEditModal = (question: Question) => {
    setEditingQuestionId(question.id);
    setNewQuestion({
      title: question.title,
      description: question.description,
      category: question.category.toUpperCase() === 'SQL' ? 'SQL' : 'DSA',
      difficulty: ['EASY', 'MEDIUM', 'HARD'].includes(question.difficulty.toUpperCase())
        ? question.difficulty.toUpperCase()
        : 'EASY',
      sampleInputOutput: question.sampleInput,
      constraints: question.constraints,
      leetcodeUrl: question.leetcodeUrl,
    });
    setError('');
    setSuccessMessage('');
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingQuestionId(null);
    setNewQuestion(emptyQuestion);
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!token) return;
    if (!window.confirm('Delete this question?')) return;

    setActiveDeleteQuestionId(questionId);
    setError('');
    setSuccessMessage('');

    try {
      await deleteQuestion(questionId, token);
      setSuccessMessage('Question deleted successfully.');
      await loadQuestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete question');
    } finally {
      setActiveDeleteQuestionId(null);
    }
  };

  const setQuestionStatusLocal = (questionId: string, nextStatus: Question['status']) => {
    setQuestions((prev) =>
      prev.map((item) => (item.id === questionId ? { ...item, status: nextStatus } : item)),
    );
  };

  const handleSolve = async (question: Question) => {
    if (!token || !question.id || !question.leetcodeUrl) return;
    const existingProgressId = progressIdByQuestionId[question.id];

    setActiveStatusQuestionId(question.id);
    setError('');

    try {
      if (!existingProgressId) {
        const createdProgressId = await markQuestionAttempted(question.id, token);
        if (createdProgressId) {
          setProgressIdByQuestionId((prev) => ({
            ...prev,
            [question.id]: createdProgressId,
          }));
        } else {
          setError('Progress id was not returned from backend.');
        }
      }
      setQuestionStatusLocal(question.id, 'attempted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update attempted status');
    } finally {
      setActiveStatusQuestionId(null);
      window.open(question.leetcodeUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleMarkSolved = async (questionId: string) => {
    if (!token || !questionId) return;
    const progressId = progressIdByQuestionId[questionId];
    if (!progressId) {
      setError('Progress id not found for this question. Click Solve first.');
      return;
    }

    setActiveStatusQuestionId(questionId);
    setError('');
    setSuccessMessage('');

    try {
      await markQuestionSolved(progressId, questionId, token);
      setSuccessMessage('Status updated to solved.');
      setQuestionStatusLocal(questionId, 'solved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update solved status');
    } finally {
      setActiveStatusQuestionId(null);
    }
  };

  const handleMarkUnsolved = async (questionId: string) => {
    if (!token || !questionId) return;
    const progressId = progressIdByQuestionId[questionId];
    if (!progressId) {
      setError('Progress id not found for this question. Click Solve first.');
      return;
    }

    setActiveStatusQuestionId(questionId);
    setError('');
    setSuccessMessage('');

    try {
      await markQuestionUnsolved(progressId, questionId, token);
      setSuccessMessage('Status updated to attempted.');
      setQuestionStatusLocal(questionId, 'attempted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update attempted status');
    } finally {
      setActiveStatusQuestionId(null);
    }
  };

  if (!token) {
    return (
      <section className="panel-card">
        <h2>Dashboard</h2>
        <p>Please login again to view question cards.</p>
      </section>
    );
  }

  return (
    <section className="panel-card dashboard-panel">
      <h2>Dashboard</h2>
      <p>Welcome, {name || 'User'}.</p>

      {isAdmin ? (
        <button
          type="button"
          className="admin-add-button modal-trigger"
          onClick={() => {
            setEditingQuestionId(null);
            setNewQuestion(emptyQuestion);
            setShowAddModal(true);
          }}
        >
          Add Question
        </button>
      ) : null}

      {loading ? <p>Loading questions...</p> : null}
      {error ? <p className="error-message">{error}</p> : null}
      {successMessage ? <p className="success-message">{successMessage}</p> : null}

      {!loading && questions.length === 0 ? <p>No questions found.</p> : null}

      <div className="questions-grid">
        {questions.map((question) => (
          <article key={question.id || question.title} className="question-card">
            <h3>{question.title || 'Untitled Question'}</h3>
            <p className="question-desc">{question.description || 'No description available.'}</p>

            <p>
              <strong>Category:</strong> {question.category || 'N/A'}
            </p>
            <p>
              <strong>Difficulty:</strong> {question.difficulty || 'N/A'}
            </p>
            <p>
              <strong>Sample Input & Output:</strong> {question.sampleInput || 'N/A'}
            </p>
            <p>
              <strong>Constraints:</strong> {question.constraints || 'N/A'}
            </p>

            <div className="question-actions">
              {!isAdmin ? (
                <button
                  type="button"
                  className="solve-button"
                  onClick={() => void handleSolve(question)}
                  disabled={!question.leetcodeUrl || activeStatusQuestionId === question.id}
                >
                  {activeStatusQuestionId === question.id ? 'Updating...' : 'Solve'}
                </button>
              ) : null}

              <span className="status-chip">Status: {question.status}</span>

              {!isAdmin ? (
                question.status === 'solved' ? (
                  <button
                    type="button"
                    className="admin-add-button"
                    onClick={() => void handleMarkUnsolved(question.id)}
                    disabled={activeStatusQuestionId === question.id}
                  >
                    {activeStatusQuestionId === question.id ? 'Updating...' : 'Mark Unsolved'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="admin-add-button"
                    onClick={() => void handleMarkSolved(question.id)}
                    disabled={question.status !== 'attempted' || activeStatusQuestionId === question.id}
                  >
                    {activeStatusQuestionId === question.id ? 'Updating...' : 'Mark Solved'}
                  </button>
                )
              ) : null}

              {isAdmin ? (
                <button type="button" className="admin-add-button" onClick={() => openEditModal(question)}>
                  Update
                </button>
              ) : null}

              {isAdmin ? (
                <button
                  type="button"
                  className="delete-button"
                  onClick={() => void handleDeleteQuestion(question.id)}
                  disabled={activeDeleteQuestionId === question.id}
                >
                  {activeDeleteQuestionId === question.id ? 'Deleting...' : 'Delete'}
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      {showAddModal ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Add Question">
          <div className="modal-card">
            <h3>{editingQuestionId ? 'Update Question' : 'Add Question'}</h3>
            <form className="auth-form" onSubmit={handleCreateQuestion}>
              <label htmlFor="question-title">Title</label>
              <input
                id="question-title"
                value={newQuestion.title}
                onChange={(event) => setNewQuestion((prev) => ({ ...prev, title: event.target.value }))}
                required
              />

              <label htmlFor="question-description">Description</label>
              <input
                id="question-description"
                value={newQuestion.description}
                onChange={(event) => setNewQuestion((prev) => ({ ...prev, description: event.target.value }))}
                required
              />

              <label htmlFor="question-category">Category</label>
              <select
                id="question-category"
                value={newQuestion.category}
                onChange={(event) => setNewQuestion((prev) => ({ ...prev, category: event.target.value }))}
                required
              >
                <option value="DSA">DSA</option>
                <option value="SQL">SQL</option>
              </select>

              <label htmlFor="question-difficulty">Difficulty</label>
              <select
                id="question-difficulty"
                value={newQuestion.difficulty}
                onChange={(event) => setNewQuestion((prev) => ({ ...prev, difficulty: event.target.value }))}
                required
              >
                <option value="EASY">EASY</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HARD">HARD</option>
              </select>

              <label htmlFor="question-sample-input-output">Sample Input Output</label>
              <input
                id="question-sample-input-output"
                value={newQuestion.sampleInputOutput}
                onChange={(event) => setNewQuestion((prev) => ({ ...prev, sampleInputOutput: event.target.value }))}
                required
              />

              <label htmlFor="question-constraints">Constraints</label>
              <input
                id="question-constraints"
                value={newQuestion.constraints}
                onChange={(event) => setNewQuestion((prev) => ({ ...prev, constraints: event.target.value }))}
                required
              />

              <label htmlFor="question-link">LeetCode Link</label>
              <input
                id="question-link"
                type="url"
                value={newQuestion.leetcodeUrl}
                onChange={(event) => setNewQuestion((prev) => ({ ...prev, leetcodeUrl: event.target.value }))}
                required
              />

              <div className="question-actions">
                <button type="submit" className="solve-button" disabled={isCreatingQuestion}>
                  {isCreatingQuestion ? 'Saving...' : editingQuestionId ? 'Update Question' : 'Save Question'}
                </button>
                <button
                  type="button"
                  className="admin-add-button"
                  onClick={closeModal}
                  disabled={isCreatingQuestion}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default Dashboard;
