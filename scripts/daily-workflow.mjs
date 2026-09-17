// Durable stage journal: resume only explicitly, never repeat a successful import.
export async function runStages(stages, journal, { execute, save, now = () => new Date().toISOString() }) {
  for (const stage of stages) {
    if (journal.steps[stage.name]?.status === 'succeeded') continue;
    journal.status = 'running';
    journal.steps[stage.name] = { status: 'running', startedAt: now() };
    await save(journal);
    try {
      await execute(stage);
      journal.steps[stage.name] = { ...journal.steps[stage.name], status: 'succeeded', completedAt: now() };
      await save(journal);
    } catch (error) {
      journal.status = 'failed';
      journal.steps[stage.name] = { ...journal.steps[stage.name], status: 'failed', failedAt: now(), error: error.message };
      await save(journal);
      throw error;
    }
  }
  journal.status = 'verified';
  await save(journal);
}
