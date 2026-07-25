(function () {
  "use strict";

  const Storage = window.JavaGardenStorage;
  const Recommendations = window.JavaGardenRecommendations;
  const main = document.getElementById("app-main");
  const nav = document.getElementById("primary-nav");
  const headerProgress = document.getElementById("header-progress");
  const storageNotice = document.getElementById("storage-notice");
  const appError = document.getElementById("app-error");
  const toastElement = document.getElementById("toast");

  const confidenceLabels = [
    "0 · I do not recognise this yet",
    "1 · I recognise it",
    "2 · I can follow an example",
    "3 · I can solve a small task",
    "4 · I can explain and adapt it"
  ];

  const typeLabels = {
    discover: "Discover",
    guided: "Guided example",
    "make-it-yours": "Make it yours",
    solo: "Independent task",
    teach: "Teach Tintinsito",
    boss: "Challenge task"
  };

  const energyLabels = {
    low: "Low energy",
    medium: "Medium energy",
    high: "High energy",
    surprise: "Surprise me"
  };

  const levelNames = [
    "Curious Seed",
    "Code Sprout",
    "Loop Gardener",
    "Object Explorer",
    "Java Bloomer",
    "Garden Guide"
  ];

  const app = {
    courseTopics: [],
    worlds: [],
    quests: [],
    state: null,
    storageAvailable: true,
    view: "home",
    currentQuestId: null,
    recommendationOffset: 0,
    revealedHints: {},
    celebration: null
  };

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatDate(value) {
    if (!value) return "Not yet";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not yet";
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  }

  function levelInfo() {
    const level = Math.floor(app.state.totalXP / 100) + 1;
    const name = levelNames[Math.min(level - 1, levelNames.length - 1)];
    return {
      level,
      name,
      progress: app.state.totalXP % 100
    };
  }

  function completedQuests() {
    return app.quests.filter(
      (quest) => Recommendations.statusFor(quest, app.state) === "completed"
    );
  }

  function subtopicStatus(subtopic) {
    const manualStatus = app.state.topicAssessments[subtopic.id];
    if (["unchecked", "unclear", "understood"].includes(manualStatus)) {
      return manualStatus;
    }

    const progressItems = subtopic.taskIds
      .map((taskId) => app.state.questProgress[taskId])
      .filter(Boolean);
    if (progressItems.length === 0) return "unchecked";
    if (
      progressItems.some((progress) =>
        ["in-progress", "stuck"].includes(progress.status)
      )
    ) {
      return "unclear";
    }

    const allTasksComplete =
      subtopic.taskIds.length > 0 &&
      subtopic.taskIds.every(
        (taskId) => app.state.questProgress[taskId]?.status === "completed"
      );
    const confidenceIsSolid = subtopic.taskIds.every(
      (taskId) => Number(app.state.questProgress[taskId]?.confidenceAfter) >= 3
    );
    return allTasksComplete && confidenceIsSolid ? "understood" : "unclear";
  }

  function courseTopicStatus(courseTopic) {
    const statuses = courseTopic.subtopics.map(subtopicStatus);
    if (statuses.every((status) => status === "understood")) return "understood";
    if (statuses.every((status) => status === "unchecked")) return "unchecked";
    return "unclear";
  }

  function courseProgress() {
    const subtopics = app.courseTopics.flatMap((topic) => topic.subtopics);
    const counts = { understood: 0, unclear: 0, unchecked: 0 };
    subtopics.forEach((subtopic) => {
      counts[subtopicStatus(subtopic)] += 1;
    });
    return {
      total: subtopics.length,
      counts,
      percent: Math.round((counts.understood / subtopics.length) * 100)
    };
  }

  function understandingLabel(status) {
    return {
      understood: "Understood",
      unclear: "Unclear",
      unchecked: "Unchecked"
    }[status];
  }

  function statusLabel(status) {
    return {
      locked: "Locked",
      available: "New",
      "in-progress": "In progress",
      stuck: "Stuck, not failed",
      completed: "Completed",
      skipped: "Skipped"
    }[status] || "Available";
  }

  function statusClass(status) {
    return `status-${status.replaceAll("-", "")}`;
  }

  function questById(questId) {
    return app.quests.find((quest) => quest.id === questId);
  }

  function worldById(worldId) {
    return app.worlds.find((world) => world.id === worldId);
  }

  function progressFor(questId) {
    return app.state.questProgress[questId] || {};
  }

  function showToast(message) {
    toastElement.textContent = message;
    toastElement.classList.add("toast-visible");
    window.clearTimeout(showToast.timeout);
    showToast.timeout = window.setTimeout(() => {
      toastElement.classList.remove("toast-visible");
    }, 4200);
  }

  function setNotice(element, message) {
    element.textContent = message;
    element.hidden = !message;
  }

  function persist(quiet) {
    const saved = Storage.save(app.state);
    if (!saved) {
      app.storageAvailable = false;
      setNotice(
        storageNotice,
        "Progress cannot be saved in this browser right now. Keep this tab open if you want to continue."
      );
    } else if (!quiet) {
      showToast("Garden progress saved.");
    }
    renderHeader();
    return saved;
  }

  function renderHeader() {
    const hasProfile = Boolean(app.state && app.state.profile);
    headerProgress.hidden = !hasProfile;
    nav.hidden = !hasProfile;
    if (!hasProfile) return;

    const info = levelInfo();
    document.getElementById("header-level").textContent =
      `${info.name} · Level ${info.level}`;
    document.getElementById("header-xp").textContent = `${app.state.totalXP} XP`;
    const bar = document.getElementById("header-progress-bar");
    bar.style.width = `${info.progress}%`;
    const progress = bar.parentElement;
    progress.setAttribute("aria-valuenow", String(info.progress));
    progress.setAttribute(
      "aria-label",
      `${info.progress} of 100 XP toward the next level`
    );
  }

  function setActiveNav() {
    nav.querySelectorAll("[data-nav]").forEach((button) => {
      if (button.dataset.nav === app.view) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    });
  }

  function navigate(view, questId, options) {
    app.view = view;
    app.currentQuestId = questId || null;
    setActiveNav();
    render();
    if (!options || options.focus !== false) {
      main.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: app.state.preferences.reducedMotion ? "auto" : "smooth" });
    }
  }

  function validateContent(courseTopics, worlds, quests) {
    const problems = [];
    const courseTopicIds = new Set();
    const subtopicIds = new Set();
    const worldIds = new Set();
    const questIds = new Set();
    const validEnergy = new Set(["low", "medium", "high"]);
    const validTypes = new Set(Object.keys(typeLabels));

    if (!Array.isArray(courseTopics) || courseTopics.length === 0) {
      problems.push("No course topics were found.");
    }
    if (!Array.isArray(worlds) || worlds.length === 0) {
      problems.push("No worlds were found.");
    }
    if (!Array.isArray(quests) || quests.length === 0) {
      problems.push("No quests were found.");
    }
    if (problems.length) throw new Error(problems.join(" "));

    worlds.forEach((world) => {
      if (!world.id || worldIds.has(world.id)) {
        problems.push(`Invalid or duplicate world ID: ${world.id || "missing"}`);
      }
      worldIds.add(world.id);
    });

    courseTopics.forEach((courseTopic) => {
      if (!courseTopic.id || courseTopicIds.has(courseTopic.id)) {
        problems.push(
          `Invalid or duplicate course topic ID: ${courseTopic.id || "missing"}`
        );
      }
      courseTopicIds.add(courseTopic.id);
      if (!Array.isArray(courseTopic.subtopics) || !courseTopic.subtopics.length) {
        problems.push(`Course topic ${courseTopic.id} has no subtopics.`);
        return;
      }
      courseTopic.subtopics.forEach((subtopic) => {
        if (!subtopic.id || subtopicIds.has(subtopic.id)) {
          problems.push(
            `Invalid or duplicate subtopic ID: ${subtopic.id || "missing"}`
          );
        }
        subtopicIds.add(subtopic.id);
        if (!Array.isArray(subtopic.taskIds)) {
          problems.push(`Subtopic ${subtopic.id} has invalid task references.`);
        }
      });
    });

    quests.forEach((quest) => {
      if (!quest.id || questIds.has(quest.id)) {
        problems.push(`Invalid or duplicate quest ID: ${quest.id || "missing"}`);
      }
      questIds.add(quest.id);
      if (!worldIds.has(quest.worldId)) {
        problems.push(`Quest ${quest.id} references a missing world.`);
      }
      if (!validEnergy.has(quest.energy)) {
        problems.push(`Quest ${quest.id} has an invalid energy value.`);
      }
      if (!validTypes.has(quest.type)) {
        problems.push(`Quest ${quest.id} has an invalid type.`);
      }
      if (!Number.isFinite(quest.xp) || quest.xp <= 0) {
        problems.push(`Quest ${quest.id} has invalid XP.`);
      }
      if (!Number.isFinite(quest.estimatedMinutes) || quest.estimatedMinutes <= 0) {
        problems.push(`Quest ${quest.id} has an invalid duration.`);
      }
      if (!Array.isArray(quest.instructions) || quest.instructions.length === 0) {
        problems.push(`Quest ${quest.id} has no instructions.`);
      }
      if (!Array.isArray(quest.evidenceChecks) || quest.evidenceChecks.length === 0) {
        problems.push(`Quest ${quest.id} has no evidence checks.`);
      }
      if (!Array.isArray(quest.prerequisites)) {
        problems.push(`Quest ${quest.id} has invalid prerequisites.`);
      }
      if (quest.questions !== undefined) {
        if (!Array.isArray(quest.questions) || quest.questions.length === 0) {
          problems.push(`Task ${quest.id} has invalid questions.`);
        } else {
          quest.questions.forEach((question) => {
            const optionIds = new Set(
              Array.isArray(question.options)
                ? question.options.map((option) => option.id)
                : []
            );
            if (
              !question.id ||
              !question.prompt ||
              optionIds.size < 2 ||
              !optionIds.has(question.correctOptionId)
            ) {
              problems.push(`Task ${quest.id} has an invalid multiple-choice question.`);
            }
          });
        }
      }
    });

    quests.forEach((quest) => {
      quest.prerequisites.forEach((prerequisiteId) => {
        if (!questIds.has(prerequisiteId)) {
          problems.push(`Quest ${quest.id} has a missing prerequisite.`);
        }
      });
    });

    courseTopics.forEach((courseTopic) => {
      courseTopic.subtopics.forEach((subtopic) => {
        subtopic.taskIds.forEach((taskId) => {
          if (!questIds.has(taskId)) {
            problems.push(`Subtopic ${subtopic.id} references a missing task.`);
          }
        });
      });
    });

    const questMap = new Map(quests.map((quest) => [quest.id, quest]));
    const visiting = new Set();
    const visited = new Set();
    function visit(questId) {
      if (visiting.has(questId)) {
        problems.push(`Circular prerequisite found at ${questId}.`);
        return;
      }
      if (visited.has(questId)) return;
      visiting.add(questId);
      const quest = questMap.get(questId);
      if (quest) quest.prerequisites.forEach(visit);
      visiting.delete(questId);
      visited.add(questId);
    }
    quests.forEach((quest) => visit(quest.id));

    if (problems.length) {
      console.error("Course content validation failed:", problems);
      throw new Error("The topic library needs attention before it can open.");
    }
  }

  function welcomeView() {
    main.innerHTML = `
      <section class="welcome-layout">
        <div class="welcome-copy">
          <span class="soft-label">A schedule-free Java companion</span>
          <h1>Grow your Java skills,<br><em>one topic at a time.</em></h1>
          <p class="lead">
            Choose what fits your energy today. There are no daily streaks,
            no punishments, and no need to see the whole course at once.
          </p>
          <ul class="promise-list" aria-label="What to expect">
            <li><span aria-hidden="true">✓</span> Three or fewer choices</li>
            <li><span aria-hidden="true">✓</span> Progress saved in this browser</li>
            <li><span aria-hidden="true">✓</span> Getting stuck counts as useful work</li>
          </ul>
        </div>

        <div class="onboarding-card">
          <div class="mascot-introduction">
            <span class="sparkle sparkle-one" aria-hidden="true">✦</span>
            <img src="./assets/tintinsito.svg" alt="Tintinsito the bunny" width="150" height="150">
            <span class="sparkle sparkle-two" aria-hidden="true">✦</span>
          </div>
          <span class="eyebrow">Meet your garden guide</span>
          <h2>Tintinsito is ready when you are.</h2>
          <p>What should Tintinsito call you? A nickname is perfect.</p>
          <form id="welcome-form">
            <label for="display-name">Your garden name</label>
            <input
              id="display-name"
              name="displayName"
              type="text"
              maxlength="32"
              autocomplete="nickname"
              placeholder="Learner"
              required
              autofocus
            >
            <p class="field-help">This stays only in this browser.</p>
            <button class="button button-primary button-wide" type="submit">
              Enter the garden
              <span aria-hidden="true">→</span>
            </button>
          </form>
        </div>
      </section>
    `;
  }

  function preferenceControls() {
    const selectedEnergy = app.state.preferences.energy;
    const selectedDuration = app.state.preferences.duration;
    return `
      <section class="preference-panel" aria-labelledby="energy-heading">
        <div>
          <span class="eyebrow">Choose what fits today</span>
          <h2 id="energy-heading">How much energy do you have?</h2>
        </div>
        <div class="energy-options" role="group" aria-label="Energy level">
          ${["low", "medium", "high", "surprise"].map((energy) => `
            <button
              type="button"
              class="energy-button energy-${energy} ${selectedEnergy === energy ? "selected" : ""}"
              data-energy="${energy}"
              aria-pressed="${selectedEnergy === energy}"
            >
              <span class="energy-icon" aria-hidden="true">${
                { low: "☁", medium: "☀", high: "✦", surprise: "❀" }[energy]
              }</span>
              <span>${energyLabels[energy]}</span>
              <small>${
                {
                  low: "5–15 min",
                  medium: "15–30 min",
                  high: "30–60 min",
                  surprise: "Tintinsito picks"
                }[energy]
              }</small>
            </button>
          `).join("")}
        </div>
        <label class="duration-picker" for="duration-preference">
          <span>I have about</span>
          <select id="duration-preference">
            <option value="none" ${selectedDuration === "none" ? "selected" : ""}>any amount of time</option>
            <option value="10" ${selectedDuration === "10" ? "selected" : ""}>10 minutes</option>
            <option value="20" ${selectedDuration === "20" ? "selected" : ""}>20 minutes</option>
            <option value="30" ${selectedDuration === "30" ? "selected" : ""}>30 minutes</option>
            <option value="45" ${selectedDuration === "45" ? "selected" : ""}>45 minutes or more</option>
          </select>
        </label>
      </section>
    `;
  }

  function questCard(item, compact) {
    const quest = item.quest || item;
    const status = item.status || Recommendations.statusFor(quest, app.state);
    const world = worldById(quest.worldId);
    const actionLabel =
      app.state.activeQuestId === quest.id || status === "in-progress"
        ? "Continue task"
        : status === "stuck"
          ? "Return gently"
          : status === "completed"
            ? "Review task"
            : status === "locked"
              ? "Locked"
              : "Open task";
    return `
      <article class="quest-card ${compact ? "quest-card-compact" : ""} ${statusClass(status)}">
        <div class="quest-card-topline">
          <span class="quest-type">${escapeHTML(typeLabels[quest.type])}</span>
          ${quest.questions?.length ? '<span class="qa-badge">Q&amp;A</span>' : ""}
          <span class="status-chip ${statusClass(status)}">${escapeHTML(statusLabel(status))}</span>
        </div>
        <div class="quest-symbol accent-${escapeHTML(world.accent)}" aria-hidden="true">
          ${escapeHTML(world.symbol)}
        </div>
        <p class="official-topic">${escapeHTML(quest.topic)}</p>
        <h3>${escapeHTML(quest.title)}</h3>
        <p>${escapeHTML(quest.description)}</p>
        <div class="quest-facts" aria-label="Task details">
          <span><span aria-hidden="true">◷</span> ${quest.estimatedMinutes} min</span>
          <span><span aria-hidden="true">◆</span> ${quest.xp} XP</span>
          <span><span aria-hidden="true">${"●".repeat(quest.difficulty)}${"○".repeat(3 - quest.difficulty)}</span> <span class="sr-only">Difficulty ${quest.difficulty} of 3</span></span>
        </div>
        <button
          class="button ${status === "locked" ? "button-disabled" : "button-secondary"} button-wide"
          type="button"
          data-open-quest="${escapeHTML(quest.id)}"
          ${status === "locked" ? "disabled" : ""}
        >
          ${escapeHTML(actionLabel)}
          ${status !== "locked" ? '<span aria-hidden="true">→</span>' : '<span aria-hidden="true">⌁</span>'}
        </button>
      </article>
    `;
  }

  function celebrationCard() {
    if (!app.celebration) return "";
    const { quest, xp, unlocked } = app.celebration;
    return `
      <section class="celebration-card" aria-labelledby="celebration-title">
        <div class="celebration-stars" aria-hidden="true">✦ ❀ ✦</div>
        <div>
          <span class="eyebrow">Task complete · +${xp} XP</span>
          <h2 id="celebration-title">${escapeHTML(quest.title)} is growing!</h2>
          <p>${
            unlocked
              ? `You unlocked <strong>${escapeHTML(unlocked.title)}</strong>.`
              : "Your garden remembers the work you did."
          }</p>
        </div>
        <button class="icon-button" type="button" data-action="dismiss-celebration">
          <span class="sr-only">Dismiss completion message</span>
          <span aria-hidden="true">×</span>
        </button>
      </section>
    `;
  }

  function courseSnapshot() {
    const progress = courseProgress();
    return `
      <section class="course-snapshot" aria-labelledby="course-snapshot-heading">
        <div>
          <span class="eyebrow">Whole-course view</span>
          <h2 id="course-snapshot-heading">${progress.counts.understood} of ${progress.total} subtopics understood</h2>
          <p>Track every official topic as understood, unclear, or unchecked.</p>
        </div>
        <div class="understanding-bar" role="img" aria-label="${progress.counts.understood} understood, ${progress.counts.unclear} unclear, ${progress.counts.unchecked} unchecked">
          <span class="bar-understood" style="width:${(progress.counts.understood / progress.total) * 100}%"></span>
          <span class="bar-unclear" style="width:${(progress.counts.unclear / progress.total) * 100}%"></span>
          <span class="bar-unchecked" style="width:${(progress.counts.unchecked / progress.total) * 100}%"></span>
        </div>
        <div class="understanding-counts">
          <span class="understanding-understood"><strong>${progress.counts.understood}</strong> Understood</span>
          <span class="understanding-unclear"><strong>${progress.counts.unclear}</strong> Unclear</span>
          <span class="understanding-unchecked"><strong>${progress.counts.unchecked}</strong> Unchecked</span>
        </div>
        <button class="button button-secondary" type="button" data-nav="quests">
          View all topics <span aria-hidden="true">→</span>
        </button>
      </section>
    `;
  }

  function homeView() {
    const recommendations = Recommendations.recommend(
      app.quests,
      app.state,
      app.state.preferences,
      app.recommendationOffset
    );
    const complete = completedQuests();
    const activeQuest = questById(app.state.activeQuestId);
    const firstName = escapeHTML(app.state.profile.displayName);

    main.innerHTML = `
      ${celebrationCard()}
      <section class="home-hero">
        <div class="hero-copy">
          <span class="soft-label">Welcome back, ${firstName}</span>
          <h1>What feels possible <em>right now?</em></h1>
          <p class="lead">You do not need to catch up. Choose one small thing that fits today.</p>
          ${
            activeQuest
              ? `
                <button class="active-quest-link" type="button" data-open-quest="${escapeHTML(activeQuest.id)}">
                  <span aria-hidden="true">↻</span>
                  Continue ${escapeHTML(activeQuest.title)}
                </button>
              `
              : ""
          }
        </div>
        <div class="hero-illustration">
          <img class="garden-backdrop" src="./assets/garden.svg" alt="">
          <img class="hero-tintinsito" src="./assets/tintinsito.svg" alt="Tintinsito the bunny" width="130" height="130">
          <p>“${complete.length ? "You came back. That counts." : "One tiny step is enough."}”</p>
        </div>
      </section>

      ${courseSnapshot()}

      ${preferenceControls()}

      <section class="recommendation-section" aria-labelledby="recommendation-heading">
        <div class="section-heading">
          <div>
            <span class="eyebrow">Tintinsito’s suggestions</span>
            <h2 id="recommendation-heading">${
              recommendations.length ? "A few gentle learning tasks" : "The first set of topics is complete!"
            }</h2>
          </div>
          ${
            recommendations.length > 1
              ? '<button class="text-button" type="button" data-action="show-another">Show me another mix <span aria-hidden="true">↻</span></button>'
              : ""
          }
        </div>
        ${
          recommendations.length
            ? `<div class="quest-grid">${recommendations.map((item) => questCard(item, false)).join("")}</div>`
            : `
              <div class="empty-card">
                <span class="empty-icon" aria-hidden="true">✿</span>
                <h3>You completed every available task.</h3>
                <p>Review any topic you like, or update the whole-course understanding map.</p>
                <button class="button button-secondary" type="button" data-nav="quests">Review topics</button>
              </div>
            `
        }
      </section>

      <section class="progress-strip" aria-labelledby="journey-heading">
        <div>
          <span class="eyebrow">Your path so far</span>
          <h2 id="journey-heading">${complete.length} of ${app.quests.length} learning tasks complete</h2>
        </div>
        <div class="wide-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${app.quests.length}" aria-valuenow="${complete.length}" aria-label="${complete.length} of ${app.quests.length} learning tasks complete">
          <span style="width: ${(complete.length / app.quests.length) * 100}%"></span>
        </div>
        <button class="button button-quiet" type="button" data-nav="garden">Visit my garden</button>
      </section>
    `;
  }

  function questionTasks(quest, progress, status) {
    if (!quest.questions?.length || status === "locked") return "";
    const quizAnswers = progress.quizAnswers || {};
    return `
      <section class="qa-section" aria-labelledby="qa-heading">
        <div class="section-heading">
          <div>
            <span class="eyebrow">Knowledge check</span>
            <h2 id="qa-heading">Try a real Q&amp;A task</h2>
            <p>Choose an answer and check it immediately. A wrong answer is a clue, not a penalty.</p>
          </div>
          <span class="qa-total">${quest.questions.length} question${quest.questions.length === 1 ? "" : "s"}</span>
        </div>
        <div class="qa-list">
          ${quest.questions.map((question, questionIndex) => {
            const savedAnswer = quizAnswers[question.id];
            const feedbackClass = savedAnswer?.isCorrect ? "qa-correct" : "qa-incorrect";
            const feedbackText = savedAnswer
              ? savedAnswer.isCorrect
                ? question.correctExplanation
                : question.incorrectExplanation
              : "";
            return `
              <form class="qa-card qa-form ${savedAnswer ? savedAnswer.isCorrect ? "qa-answer-correct" : "qa-answer-incorrect" : ""}" data-question-id="${escapeHTML(question.id)}" data-task-id="${escapeHTML(quest.id)}">
                <fieldset>
                  <legend><span>${questionIndex + 1}</span>${escapeHTML(question.prompt)}</legend>
                  <div class="answer-options">
                    ${question.options.map((option) => `
                      <label class="answer-option">
                        <input
                          type="radio"
                          name="answer"
                          value="${escapeHTML(option.id)}"
                          ${savedAnswer?.selectedOptionId === option.id ? "checked" : ""}
                        >
                        <span>${escapeHTML(option.text)}</span>
                      </label>
                    `).join("")}
                  </div>
                </fieldset>
                <div class="qa-actions">
                  <button class="button button-secondary" type="submit">
                    ${savedAnswer ? "Check again" : "Check answer"}
                  </button>
                  <p class="qa-feedback ${savedAnswer ? feedbackClass : ""}" aria-live="polite">
                    ${savedAnswer ? escapeHTML(feedbackText) : "No answer checked yet."}
                  </p>
                </div>
              </form>
            `;
          }).join("")}
        </div>
      </section>
    `;
  }

  function questView() {
    const quest = questById(app.currentQuestId);
    if (!quest) {
      navigate("quests");
      return;
    }

    const world = worldById(quest.worldId);
    const status = Recommendations.statusFor(quest, app.state);
    const progress = progressFor(quest.id);
    const revealed = app.revealedHints[quest.id] || 0;
    const isActive = app.state.activeQuestId === quest.id;
    const canWork = ["in-progress", "stuck"].includes(status);
    const actionButtons = [];

    if (status === "available") {
      actionButtons.push('<button class="button button-primary" type="button" data-action="start-quest">Start this task</button>');
    } else if (status === "in-progress" && !isActive) {
      actionButtons.push('<button class="button button-primary" type="button" data-action="start-quest">Continue this task</button>');
    } else if (status === "stuck") {
      actionButtons.push('<button class="button button-primary" type="button" data-action="start-quest">Return to this task</button>');
    } else if (isActive) {
      actionButtons.push('<button class="button button-quiet" type="button" data-action="pause-quest">Pause for now</button>');
    }

    if (canWork) {
      actionButtons.push('<button class="button button-support" type="button" data-action="open-stuck">I’m stuck</button>');
      actionButtons.push('<button class="button button-primary" type="button" data-action="open-complete">Complete task</button>');
    }

    main.innerHTML = `
      <button class="back-button" type="button" data-nav="quests">
        <span aria-hidden="true">←</span> All topics
      </button>

      <article class="quest-page">
        <header class="quest-page-header accent-border-${escapeHTML(world.accent)}">
          <div>
            <div class="quest-card-topline">
              <span class="quest-type">${escapeHTML(typeLabels[quest.type])}</span>
              <span class="status-chip ${statusClass(status)}">${escapeHTML(statusLabel(status))}</span>
            </div>
            <p class="official-topic">${escapeHTML(world.name)} · ${escapeHTML(quest.topic)}</p>
            <h1>${escapeHTML(quest.title)}</h1>
            <p class="lead">${escapeHTML(quest.description)}</p>
            <div class="quest-facts quest-facts-large">
              <span><span aria-hidden="true">◷</span> About ${quest.estimatedMinutes} minutes</span>
              <span><span aria-hidden="true">◆</span> ${quest.xp} XP</span>
              <span>Difficulty ${quest.difficulty} of 3</span>
            </div>
          </div>
          <div class="mascot-note">
            <img src="./assets/tintinsito.svg" alt="" width="92" height="92">
            <p>“${escapeHTML(quest.mascotMessage)}”</p>
          </div>
        </header>

        ${
          status === "locked"
            ? `
              <div class="locked-message">
                <span aria-hidden="true">⌁</span>
                <div>
                  <h2>This path is still growing.</h2>
                  <p>Complete the earlier task${quest.prerequisites.length === 1 ? "" : "s"} first. You do not need to rush.</p>
                </div>
              </div>
            `
            : ""
        }

        <div class="quest-page-grid">
          <section class="steps-card" aria-labelledby="steps-heading">
            <span class="eyebrow">Your path</span>
            <h2 id="steps-heading">Learning-task steps</h2>
            <ol class="quest-steps">
              ${quest.instructions.map((instruction) => `<li><span>${escapeHTML(instruction)}</span></li>`).join("")}
            </ol>
          </section>

          <aside class="quest-aside">
            <section class="hint-card">
              <span class="eyebrow">A little light, when needed</span>
              <h2>Hint ladder</h2>
              <p>Reveal only as much as helps you move again.</p>
              <div class="revealed-hints">
                ${quest.hints.slice(0, revealed).map((hint, index) => `
                  <div class="hint-item">
                    <span aria-hidden="true">${index + 1}</span>
                    <p>${escapeHTML(hint)}</p>
                  </div>
                `).join("")}
              </div>
              ${
                revealed < quest.hints.length
                  ? `<button class="button button-quiet button-wide" type="button" data-action="reveal-hint">Reveal hint ${revealed + 1}</button>`
                  : '<p class="all-hints-shown">All hints are open. Asking for help is a good next step.</p>'
              }
            </section>

            <section class="evidence-preview">
              <span class="eyebrow">How you’ll know</span>
              <h2>Completion evidence</h2>
              <ul>
                ${quest.evidenceChecks.map((evidence) => `<li><span aria-hidden="true">○</span>${escapeHTML(evidence)}</li>`).join("")}
              </ul>
            </section>
          </aside>
        </div>

        ${questionTasks(quest, progress, status)}

        ${
          status === "completed"
            ? `
              <section class="completed-summary">
                <span class="completed-seal" aria-hidden="true">✓</span>
                <div>
                  <span class="eyebrow">Completed ${escapeHTML(formatDate(progress.completedAt))}</span>
                  <h2>This task is part of your topic progress.</h2>
                  <p>You recorded ${progress.actualMinutes || "some"} minutes and confidence ${progress.confidenceAfter ?? "—"} of 4. Reopening it never removes your progress.</p>
                  ${progress.reflection ? `<blockquote>“${escapeHTML(progress.reflection)}”</blockquote>` : ""}
                </div>
              </section>
            `
            : `
              <div class="quest-action-bar">
                <div>
                  <strong>${
                    isActive
                      ? "This is your active task."
                      : status === "stuck"
                        ? "You can return in one small step."
                        : "Ready when you are."
                  }</strong>
                  <span>${
                    progress.startedAt
                      ? `First opened ${escapeHTML(formatDate(progress.startedAt))}`
                      : "Starting records the time, but there is no countdown."
                  }</span>
                </div>
                <div>${actionButtons.join("")}</div>
              </div>
            `
        }

        <p class="source-note">
          Course alignment:
          <a href="${escapeHTML(quest.sourceUrl)}" target="_blank" rel="noopener noreferrer">HHU Programmierung topic page <span class="sr-only">(opens in a new tab)</span></a>.
          This companion does not replace official course material.
        </p>
      </article>
    `;
  }

  function worldProgress(world) {
    const quests = app.quests.filter((quest) => quest.worldId === world.id);
    const completed = quests.filter(
      (quest) => Recommendations.statusFor(quest, app.state) === "completed"
    ).length;
    const available = quests.some(
      (quest) => Recommendations.statusFor(quest, app.state) !== "locked"
    );
    return {
      quests,
      completed,
      percent: Math.round((completed / quests.length) * 100),
      status: completed === quests.length ? "completed" : available ? "available" : "locked"
    };
  }

  function questsView() {
    const course = courseProgress();
    main.innerHTML = `
      <section class="page-heading">
        <span class="soft-label">The complete syllabus at a glance</span>
        <h1>Course topics</h1>
        <p class="lead">See every official topic and subtopic in one place. Task results update this map automatically, or you can record your own understanding.</p>
      </section>

      <section class="global-progress-card" aria-labelledby="global-progress-heading">
        <div class="global-progress-score">
          <strong>${course.percent}%</strong>
          <span>of subtopics understood</span>
        </div>
        <div>
          <h2 id="global-progress-heading">Whole-course understanding</h2>
          <div class="understanding-bar" role="img" aria-label="${course.counts.understood} understood, ${course.counts.unclear} unclear, ${course.counts.unchecked} unchecked">
            <span class="bar-understood" style="width:${(course.counts.understood / course.total) * 100}%"></span>
            <span class="bar-unclear" style="width:${(course.counts.unclear / course.total) * 100}%"></span>
            <span class="bar-unchecked" style="width:${(course.counts.unchecked / course.total) * 100}%"></span>
          </div>
          <div class="understanding-counts">
            <span class="understanding-understood"><strong>${course.counts.understood}</strong> Understood</span>
            <span class="understanding-unclear"><strong>${course.counts.unclear}</strong> Unclear</span>
            <span class="understanding-unchecked"><strong>${course.counts.unchecked}</strong> Unchecked</span>
          </div>
        </div>
      </section>

      <section class="course-map" aria-labelledby="course-map-heading">
        <div class="section-heading">
          <div>
            <span class="eyebrow">15 syllabus topics · 30 subtopics</span>
            <h2 id="course-map-heading">Your understanding map</h2>
          </div>
          <p class="map-help">“Automatic” follows saved task progress. Choose another value when your own assessment is more accurate.</p>
        </div>
        <div class="course-topic-grid">
          ${app.courseTopics.map((courseTopic) => {
            const topicStatus = courseTopicStatus(courseTopic);
            return `
              <article class="course-topic-card understanding-${topicStatus}">
                <header>
                  <div class="course-topic-number">${courseTopic.order}</div>
                  <div>
                    <p>${escapeHTML(courseTopic.section)}</p>
                    <h3>${escapeHTML(courseTopic.title)}</h3>
                  </div>
                  <span class="understanding-pill understanding-${topicStatus}">${escapeHTML(understandingLabel(topicStatus))}</span>
                </header>
                <div class="subtopic-list">
                  ${courseTopic.subtopics.map((subtopic) => {
                    const status = subtopicStatus(subtopic);
                    const manual = app.state.topicAssessments[subtopic.id] || "";
                    return `
                      <div class="subtopic-row">
                        <div>
                          <strong>${escapeHTML(subtopic.name)}</strong>
                          <small>${subtopic.taskIds.length ? `${subtopic.taskIds.length} linked learning task${subtopic.taskIds.length === 1 ? "" : "s"}` : "No in-app task yet"}</small>
                        </div>
                        <label class="sr-only" for="status-${escapeHTML(subtopic.id)}">Understanding status for ${escapeHTML(subtopic.name)}</label>
                        <select
                          id="status-${escapeHTML(subtopic.id)}"
                          class="understanding-select understanding-${status}"
                          data-subtopic-status="${escapeHTML(subtopic.id)}"
                        >
                          <option value="" ${manual === "" ? "selected" : ""}>Automatic · ${escapeHTML(understandingLabel(status))}</option>
                          <option value="understood" ${manual === "understood" ? "selected" : ""}>Understood</option>
                          <option value="unclear" ${manual === "unclear" ? "selected" : ""}>Unclear</option>
                          <option value="unchecked" ${manual === "unchecked" ? "selected" : ""}>Unchecked</option>
                        </select>
                      </div>
                    `;
                  }).join("")}
                </div>
                <a class="course-source-link" href="${escapeHTML(courseTopic.sourceUrl)}" target="_blank" rel="noopener noreferrer">
                  Official topic page <span aria-hidden="true">↗</span>
                </a>
              </article>
            `;
          }).join("")}
        </div>
      </section>

      <section class="available-tasks" aria-labelledby="available-tasks-heading">
        <div class="section-heading">
          <div>
            <span class="eyebrow">Small practice activities</span>
            <h2 id="available-tasks-heading">Available learning tasks</h2>
          </div>
          <p class="map-help">More topic tasks will be added in course order.</p>
        </div>
        <div class="world-list">
        ${app.worlds.map((world) => {
          const progress = worldProgress(world);
          return `
            <section class="world-section accent-border-${escapeHTML(world.accent)}">
              <header class="world-heading">
                <div class="world-icon accent-${escapeHTML(world.accent)}" aria-hidden="true">${escapeHTML(world.symbol)}</div>
                <div>
                  <span class="eyebrow">World ${world.order} · Official topic: ${escapeHTML(world.officialTopic)}</span>
                  <h2>${escapeHTML(world.name)}</h2>
                  <p>${escapeHTML(world.description)}</p>
                </div>
                <div class="world-meter">
                  <strong>${progress.completed}/${progress.quests.length}</strong>
                  <span>tasks</span>
                  <div class="mini-progress" role="progressbar" aria-label="${escapeHTML(world.name)} progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress.percent}">
                    <span style="width: ${progress.percent}%"></span>
                  </div>
                </div>
              </header>
              <div class="quest-grid quest-grid-compact">
                ${progress.quests.map((quest) => questCard(quest, true)).join("")}
              </div>
            </section>
          `;
        }).join("")}
        </div>
      </section>
      <div class="coming-soon">
        <span aria-hidden="true">⋯</span>
        <div>
          <h2>More topic tasks are being prepared.</h2>
          <p>The full course is visible above now. New practice tasks can be added without changing your understanding notes.</p>
        </div>
      </div>
    `;
  }

  function gardenStageInfo(count) {
    if (count >= 25) return { stage: 4, name: "Course garden in bloom", message: "Most of the syllabus is flowering." };
    if (count >= 15) return { stage: 3, name: "Strong course sunflower", message: "Understanding across the course brought a flower." };
    if (count >= 5) return { stage: 2, name: "Growing course sprout", message: "Several understood subtopics are taking root." };
    if (count >= 1) return { stage: 1, name: "First understanding seedling", message: "An understood subtopic made the first shoot appear." };
    return { stage: 0, name: "Course seed at rest", message: "Unchecked and unclear soil is not failure. The seed is ready." };
  }

  function gardenView() {
    const complete = completedQuests();
    const course = courseProgress();
    const garden = gardenStageInfo(course.counts.understood);
    const bossComplete = app.state.questProgress["arrays-boss-find-largest-v1"]?.status === "completed";
    const returnedFromStuck = Object.values(app.state.questProgress).some(
      (progress) => progress.returnedFromStuck
    );

    main.innerHTML = `
      <section class="page-heading centered-heading">
        <span class="soft-label">A record of real study actions</span>
        <h1>${escapeHTML(app.state.profile.displayName)}’s garden</h1>
        <p class="lead">Each garden bed represents one official course topic. Understanding grows flowers; unclear areas stay as living sprouts; unchecked areas wait as seeds.</p>
      </section>

      <section class="garden-scene garden-stage-${garden.stage}" aria-labelledby="garden-stage-heading">
        <img src="./assets/garden.svg" alt="">
        <div class="growing-plant" aria-hidden="true">
          <span class="plant-pot"></span>
          <span class="plant-stem"></span>
          <span class="plant-leaf plant-leaf-left"></span>
          <span class="plant-leaf plant-leaf-right"></span>
          <span class="plant-bloom">✿</span>
        </div>
        <div class="garden-caption">
          <span class="eyebrow">Current growth</span>
          <h2 id="garden-stage-heading">${escapeHTML(garden.name)}</h2>
          <p>${course.counts.understood}/${course.total} subtopics understood. ${escapeHTML(garden.message)}</p>
        </div>
      </section>

      <section class="course-beds" aria-labelledby="course-beds-heading">
        <div class="section-heading">
          <div>
            <span class="eyebrow">The complete syllabus as a garden</span>
            <h2 id="course-beds-heading">15 course beds</h2>
          </div>
          <button class="text-button" type="button" data-nav="quests">Update understanding <span aria-hidden="true">→</span></button>
        </div>
        <div class="course-bed-grid">
          ${app.courseTopics.map((courseTopic) => {
            const status = courseTopicStatus(courseTopic);
            const understood = courseTopic.subtopics.filter(
              (subtopic) => subtopicStatus(subtopic) === "understood"
            ).length;
            const icon = status === "understood" ? "🌻" : status === "unclear" ? "🌱" : "·";
            return `
              <article class="course-bed understanding-${status}">
                <span class="bed-number">${courseTopic.order}</span>
                <span class="bed-plant" aria-hidden="true">${icon}</span>
                <h3>${escapeHTML(courseTopic.title)}</h3>
                <p>${understood}/${courseTopic.subtopics.length} subtopics understood</p>
                <span class="understanding-pill understanding-${status}">${escapeHTML(understandingLabel(status))}</span>
              </article>
            `;
          }).join("")}
        </div>
      </section>

      <section class="reward-section" aria-labelledby="rewards-heading">
        <div class="section-heading">
          <div>
            <span class="eyebrow">Garden keepsakes</span>
            <h2 id="rewards-heading">Things your work has grown</h2>
          </div>
          <strong>${complete.length} / ${app.quests.length} learning tasks</strong>
        </div>
        <div class="reward-grid">
          <article class="reward-card ${complete.length >= 1 ? "unlocked" : "locked"}">
            <span aria-hidden="true">🌱</span>
            <h3>First seedling</h3>
            <p>Complete one learning task</p>
          </article>
          <article class="reward-card ${complete.length >= 3 ? "unlocked" : "locked"}">
            <span aria-hidden="true">🌿</span>
            <h3>Brave sprout</h3>
            <p>Complete three learning tasks</p>
          </article>
          <article class="reward-card ${returnedFromStuck ? "unlocked" : "locked"}">
            <span aria-hidden="true">🍀</span>
            <h3>Second-chance clover</h3>
            <p>Return after getting stuck</p>
          </article>
          <article class="reward-card ${bossComplete ? "unlocked" : "locked"}">
            <span aria-hidden="true">🌻</span>
            <h3>Boss sunflower</h3>
            <p>Complete the array challenge task</p>
          </article>
        </div>
      </section>
    `;
  }

  function tutorView() {
    const stuckItems = app.quests
      .map((quest) => ({ quest, progress: progressFor(quest.id) }))
      .filter((item) => item.progress.status === "stuck");
    const recentIndependent = app.quests
      .map((quest) => ({ quest, progress: progressFor(quest.id) }))
      .filter(
        (item) =>
          item.progress.status === "completed" &&
          ["solo", "boss"].includes(item.quest.type)
      )
      .sort((a, b) => String(b.progress.completedAt).localeCompare(String(a.progress.completedAt)))
      .slice(0, 3);

    main.innerHTML = `
      <section class="page-heading">
        <span class="soft-label">Turn confusion into a useful conversation</span>
        <h1>Tutor Corner</h1>
        <p class="lead">Your notes stay on this device. Show this page to a tutor when you want help.</p>
      </section>

      <section class="tutor-summary">
        <div>
          <span aria-hidden="true">?</span>
          <strong>${stuckItems.length}</strong>
          <small>stuck task${stuckItems.length === 1 ? "" : "s"}</small>
        </div>
        <div>
          <span aria-hidden="true">✎</span>
          <strong>${stuckItems.filter((item) => item.progress.tutorQuestion).length}</strong>
          <small>prepared question${stuckItems.filter((item) => item.progress.tutorQuestion).length === 1 ? "" : "s"}</small>
        </div>
        <div>
          <span aria-hidden="true">◆</span>
          <strong>${recentIndependent.length}</strong>
          <small>recent solo/boss wins</small>
        </div>
      </section>

      <section aria-labelledby="stuck-heading">
        <div class="section-heading">
          <div>
            <span class="eyebrow">Ready to discuss</span>
            <h2 id="stuck-heading">Stuck learning tasks</h2>
          </div>
        </div>
        ${
          stuckItems.length
            ? `<div class="tutor-list">${stuckItems.map(({ quest, progress }) => `
                <article class="tutor-card">
                  <header>
                    <div>
                      <p class="official-topic">${escapeHTML(quest.topic)}</p>
                      <h3>${escapeHTML(quest.title)}</h3>
                    </div>
                    <span class="status-chip status-stuck">Stuck, not failed</span>
                  </header>
                  <dl>
                    <div>
                      <dt>Where it became difficult</dt>
                      <dd>${escapeHTML(progress.stuckBegin || "Not recorded yet")}</dd>
                    </div>
                    <div>
                      <dt>What I tried</dt>
                      <dd>${escapeHTML(progress.attempts || "Not recorded yet")}</dd>
                    </div>
                    <div>
                      <dt>Error message</dt>
                      <dd class="error-copy">${escapeHTML(progress.errorMessage || "No error recorded")}</dd>
                    </div>
                    <div class="tutor-question">
                      <dt>Question for the tutor</dt>
                      <dd>${escapeHTML(progress.tutorQuestion || "Help me identify a useful next question.")}</dd>
                    </div>
                  </dl>
                  <button class="button button-secondary" type="button" data-open-quest="${escapeHTML(quest.id)}">
                    Return to task <span aria-hidden="true">→</span>
                  </button>
                </article>
              `).join("")}</div>`
            : `
              <div class="empty-card">
                <span class="empty-icon" aria-hidden="true">☁</span>
                <h3>Nothing is waiting here.</h3>
                <p>If a task becomes confusing, “I’m stuck” will help you capture the exact point.</p>
              </div>
            `
        }
      </section>

      ${
        recentIndependent.length
          ? `
            <section class="recent-work" aria-labelledby="recent-heading">
              <span class="eyebrow">Useful context</span>
              <h2 id="recent-heading">Recent independent work</h2>
              <ul>
                ${recentIndependent.map(({ quest, progress }) => `
                  <li>
                    <strong>${escapeHTML(quest.title)}</strong>
                    <span>${progress.actualMinutes || "—"} min · confidence ${progress.confidenceAfter ?? "—"}/4</span>
                  </li>
                `).join("")}
              </ul>
            </section>
          `
          : ""
      }
    `;
  }

  function settingsView() {
    main.innerHTML = `
      <section class="page-heading">
        <span class="soft-label">A few calm controls</span>
        <h1>Settings</h1>
        <p class="lead">No account, analytics, or cloud service is connected.</p>
      </section>

      <div class="settings-grid">
        <section class="settings-card">
          <span class="eyebrow">Local profile</span>
          <h2>Your garden name</h2>
          <form id="profile-form">
            <label for="settings-display-name">Display name</label>
            <input id="settings-display-name" type="text" maxlength="32" value="${escapeHTML(app.state.profile.displayName)}" required>
            <button class="button button-secondary" type="submit">Save name</button>
          </form>
        </section>

        <section class="settings-card">
          <span class="eyebrow">Comfort</span>
          <h2>Motion preference</h2>
          <label class="toggle-row">
            <span>
              <strong>Reduce decorative motion</strong>
              <small>Transitions become immediate and celebrations stay still.</small>
            </span>
            <input id="reduced-motion" type="checkbox" ${app.state.preferences.reducedMotion ? "checked" : ""}>
          </label>
        </section>

        <section class="settings-card storage-card">
          <span class="eyebrow">Where progress lives</span>
          <h2>This browser only</h2>
          <p>Topic-task history, confidence, tutor notes, and XP are saved in this browser profile. Clearing site data removes them.</p>
          <dl class="settings-details">
            <div><dt>Last saved</dt><dd>${escapeHTML(formatDate(app.state.lastSavedAt))}</dd></div>
            <div><dt>Storage status</dt><dd>${app.storageAvailable ? "Available" : "Temporary mode"}</dd></div>
            <div><dt>Data version</dt><dd>${app.state.schemaVersion}</dd></div>
          </dl>
          <p class="coming-note">Backup import and export are planned for v0.2.</p>
        </section>

        <section class="settings-card danger-zone">
          <span class="eyebrow">Danger zone</span>
          <h2>Start over</h2>
          <p>Reset removes all Java Garden progress from this browser. It takes a separate confirmation.</p>
          <button class="button button-danger-outline" type="button" data-action="open-reset">Reset garden progress</button>
        </section>
      </div>
    `;
  }

  function render() {
    if (!app.state.profile) {
      welcomeView();
      renderHeader();
      return;
    }

    renderHeader();
    setActiveNav();
    if (app.view === "quest") questView();
    else if (app.view === "quests") questsView();
    else if (app.view === "garden") gardenView();
    else if (app.view === "tutor") tutorView();
    else if (app.view === "settings") settingsView();
    else homeView();
  }

  function startQuest(questId) {
    const quest = questById(questId);
    if (!quest) return;
    const status = Recommendations.statusFor(quest, app.state);
    if (status === "locked" || status === "completed") return;

    const progress = progressFor(questId);
    const wasStuck = status === "stuck";
    app.state.questProgress[questId] = {
      ...progress,
      questId,
      status: "in-progress",
      startedAt: progress.startedAt || new Date().toISOString(),
      lastResumedAt: new Date().toISOString(),
      attemptCount: (progress.attemptCount || 0) + 1,
      returnedFromStuck: Boolean(progress.returnedFromStuck || wasStuck)
    };
    app.state.activeQuestId = questId;
    persist(true);
    showToast(wasStuck ? "Welcome back. Returning is worth celebrating." : "Task started. There is no countdown.");
    navigate("quest", questId, { focus: false });
  }

  function pauseQuest(questId) {
    if (app.state.activeQuestId === questId) {
      app.state.activeQuestId = null;
      persist(true);
      showToast("Task paused. It will wait without penalty.");
      navigate("home");
    }
  }

  function openStuckDialog(questId) {
    const progress = progressFor(questId);
    document.getElementById("stuck-quest-id").value = questId;
    document.getElementById("stuck-begin").value = progress.stuckBegin || "";
    document.getElementById("stuck-tried").value = progress.attempts || "";
    document.getElementById("stuck-error").value = progress.errorMessage || "";
    document.getElementById("stuck-question").value = progress.tutorQuestion || "";
    document.getElementById("stuck-dialog").showModal();
  }

  function confidenceOptions(selected) {
    return confidenceLabels
      .map((label, value) => `<option value="${value}" ${Number(selected) === value ? "selected" : ""}>${escapeHTML(label)}</option>`)
      .join("");
  }

  function openCompleteDialog(questId) {
    const quest = questById(questId);
    const progress = progressFor(questId);
    document.getElementById("complete-quest-id").value = questId;
    document.getElementById("actual-minutes").value =
      progress.actualMinutes || quest.estimatedMinutes;
    document.getElementById("confidence-before").innerHTML =
      confidenceOptions(progress.confidenceBefore ?? 1);
    document.getElementById("confidence-after").innerHTML =
      confidenceOptions(progress.confidenceAfter ?? 2);
    document.getElementById("completion-reflection").value =
      progress.reflection || "";
    document.getElementById("tutor-help-used").checked =
      Boolean(progress.helpUsed);
    document.getElementById("completion-evidence").innerHTML =
      quest.evidenceChecks.map((evidence, index) => `
        <label class="check-row evidence-check">
          <input type="checkbox" name="evidence" value="${index}" ${progress.evidenceCompleted?.[index] ? "checked" : ""}>
          <span>${escapeHTML(evidence)}</span>
        </label>
      `).join("");
    document.getElementById("evidence-help").textContent =
      `Choose at least ${quest.minEvidence} honest ${quest.minEvidence === 1 ? "statement" : "statements"}.`;
    document.getElementById("complete-error").hidden = true;
    document.getElementById("complete-dialog").showModal();
  }

  function completeQuest(questId, formData) {
    const quest = questById(questId);
    const oldProgress = progressFor(questId);
    const firstCompletion = oldProgress.status !== "completed";
    const beforeStatuses = new Map(
      app.quests.map((item) => [item.id, Recommendations.statusFor(item, app.state)])
    );
    const bonus = firstCompletion && oldProgress.returnedFromStuck ? 10 : 0;
    const awarded = firstCompletion ? quest.xp + bonus : 0;

    app.state.questProgress[questId] = {
      ...oldProgress,
      questId,
      status: "completed",
      completedAt: new Date().toISOString(),
      actualMinutes: formData.actualMinutes,
      confidenceBefore: formData.confidenceBefore,
      confidenceAfter: formData.confidenceAfter,
      evidenceCompleted: formData.evidenceCompleted,
      reflection: formData.reflection,
      helpUsed: formData.helpUsed,
      xpAwarded: (oldProgress.xpAwarded || 0) + awarded
    };
    app.state.totalXP += awarded;
    app.state.activeQuestId = null;
    app.state.mostRecentCompletedQuestId = questId;

    const unlocked = app.quests.find((candidate) => {
      const before = beforeStatuses.get(candidate.id);
      const after = Recommendations.statusFor(candidate, app.state);
      return before === "locked" && after === "available";
    });

    app.celebration = { quest, xp: awarded, unlocked };
    persist(true);
    document.body.classList.add("celebrating");
    window.setTimeout(() => document.body.classList.remove("celebrating"), 900);
    navigate("home");
  }

  function handleMainClick(event) {
    const navButton = event.target.closest("[data-nav]");
    if (navButton) {
      navigate(navButton.dataset.nav);
      return;
    }

    const questButton = event.target.closest("[data-open-quest]");
    if (questButton) {
      navigate("quest", questButton.dataset.openQuest);
      return;
    }

    const energyButton = event.target.closest("[data-energy]");
    if (energyButton) {
      app.state.preferences.energy = energyButton.dataset.energy;
      app.recommendationOffset = 0;
      persist(true);
      homeView();
      return;
    }

    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;
    const action = actionButton.dataset.action;
    if (action === "show-another") {
      app.recommendationOffset += 1;
      homeView();
    } else if (action === "dismiss-celebration") {
      app.celebration = null;
      homeView();
    } else if (action === "start-quest") {
      startQuest(app.currentQuestId);
    } else if (action === "pause-quest") {
      pauseQuest(app.currentQuestId);
    } else if (action === "open-stuck") {
      openStuckDialog(app.currentQuestId);
    } else if (action === "open-complete") {
      openCompleteDialog(app.currentQuestId);
    } else if (action === "reveal-hint") {
      const quest = questById(app.currentQuestId);
      const current = app.revealedHints[quest.id] || 0;
      app.revealedHints[quest.id] = Math.min(current + 1, quest.hints.length);
      questView();
      const hints = main.querySelectorAll(".hint-item");
      if (hints.length) hints[hints.length - 1].scrollIntoView({ block: "nearest" });
    } else if (action === "open-reset") {
      document.getElementById("confirm-reset").checked = false;
      document.getElementById("reset-error").hidden = true;
      document.getElementById("reset-dialog").showModal();
    }
  }

  function handleMainChange(event) {
    if (event.target.matches("[data-subtopic-status]")) {
      const subtopicId = event.target.dataset.subtopicStatus;
      if (event.target.value) {
        app.state.topicAssessments[subtopicId] = event.target.value;
      } else {
        delete app.state.topicAssessments[subtopicId];
      }
      persist(true);
      questsView();
      showToast("Topic understanding updated.");
    } else if (event.target.id === "duration-preference") {
      app.state.preferences.duration = event.target.value;
      app.recommendationOffset = 0;
      persist(true);
      homeView();
    } else if (event.target.id === "reduced-motion") {
      app.state.preferences.reducedMotion = event.target.checked;
      document.documentElement.classList.toggle(
        "reduce-motion",
        event.target.checked
      );
      persist(true);
      showToast("Motion preference saved.");
    }
  }

  function handleMainSubmit(event) {
    event.preventDefault();
    if (event.target.classList.contains("qa-form")) {
      const taskId = event.target.dataset.taskId;
      const questionId = event.target.dataset.questionId;
      const quest = questById(taskId);
      const question = quest?.questions?.find((item) => item.id === questionId);
      const selected = new FormData(event.target).get("answer");
      const feedback = event.target.querySelector(".qa-feedback");
      if (!selected) {
        feedback.className = "qa-feedback qa-incorrect";
        feedback.textContent = "Choose one answer before checking.";
        return;
      }

      const isCorrect = selected === question.correctOptionId;
      const progress = progressFor(taskId);
      const previousAnswer = progress.quizAnswers?.[questionId];
      app.state.questProgress[taskId] = {
        ...progress,
        questId: taskId,
        quizAnswers: {
          ...(progress.quizAnswers || {}),
          [questionId]: {
            selectedOptionId: selected,
            isCorrect,
            attempts: (previousAnswer?.attempts || 0) + 1,
            answeredAt: new Date().toISOString()
          }
        }
      };
      persist(true);
      event.target.classList.remove("qa-answer-correct", "qa-answer-incorrect");
      event.target.classList.add(
        isCorrect ? "qa-answer-correct" : "qa-answer-incorrect"
      );
      feedback.className = `qa-feedback ${isCorrect ? "qa-correct" : "qa-incorrect"}`;
      feedback.textContent = isCorrect
        ? question.correctExplanation
        : question.incorrectExplanation;
      showToast(isCorrect ? "Correct — that idea is taking root." : "Not quite yet. The explanation is a useful clue.");
    } else if (event.target.id === "welcome-form") {
      const name = document.getElementById("display-name").value.trim();
      if (!name) return;
      app.state.profile = {
        displayName: name.slice(0, 32),
        mascot: "tintinsito-bunny",
        theme: "pastel-garden",
        createdAt: new Date().toISOString()
      };
      persist(true);
      navigate("home");
      showToast("Welcome to your garden.");
    } else if (event.target.id === "profile-form") {
      const name = document.getElementById("settings-display-name").value.trim();
      if (!name) return;
      app.state.profile.displayName = name.slice(0, 32);
      persist(true);
      showToast("Garden name saved.");
      settingsView();
    }
  }

  function bindEvents() {
    main.addEventListener("click", handleMainClick);
    main.addEventListener("change", handleMainChange);
    main.addEventListener("submit", handleMainSubmit);

    document.addEventListener("click", (event) => {
      const navButton = event.target.closest(".site-header [data-nav], .primary-nav [data-nav]");
      if (navButton) navigate(navButton.dataset.nav);

      const closeButton = event.target.closest("[data-close-dialog]");
      if (closeButton) {
        document.getElementById(closeButton.dataset.closeDialog).close();
      }
    });

    document.getElementById("stuck-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const questId = document.getElementById("stuck-quest-id").value;
      const progress = progressFor(questId);
      app.state.questProgress[questId] = {
        ...progress,
        questId,
        status: "stuck",
        startedAt: progress.startedAt || new Date().toISOString(),
        stuckAt: new Date().toISOString(),
        stuckBegin: document.getElementById("stuck-begin").value.trim(),
        attempts: document.getElementById("stuck-tried").value.trim(),
        errorMessage: document.getElementById("stuck-error").value.trim(),
        tutorQuestion: document.getElementById("stuck-question").value.trim()
      };
      if (app.state.activeQuestId === questId) app.state.activeQuestId = null;
      persist(true);
      document.getElementById("stuck-dialog").close();
      navigate("tutor");
      showToast("Saved to Tutor Corner. Getting stuck is part of the task.");
    });

    document.getElementById("complete-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const questId = document.getElementById("complete-quest-id").value;
      const quest = questById(questId);
      const checked = Array.from(
        document.querySelectorAll('#completion-evidence input[name="evidence"]')
      ).map((input) => input.checked);
      const checkedCount = checked.filter(Boolean).length;
      const error = document.getElementById("complete-error");
      if (checkedCount < quest.minEvidence) {
        error.textContent =
          `Choose at least ${quest.minEvidence} evidence ${quest.minEvidence === 1 ? "statement" : "statements"}. Low confidence is completely okay.`;
        error.hidden = false;
        return;
      }

      error.hidden = true;
      completeQuest(questId, {
        actualMinutes: Number(document.getElementById("actual-minutes").value),
        confidenceBefore: Number(document.getElementById("confidence-before").value),
        confidenceAfter: Number(document.getElementById("confidence-after").value),
        evidenceCompleted: checked,
        reflection: document.getElementById("completion-reflection").value.trim(),
        helpUsed: document.getElementById("tutor-help-used").checked
      });
      document.getElementById("complete-dialog").close();
    });

    document.getElementById("reset-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const confirmed = document.getElementById("confirm-reset").checked;
      const error = document.getElementById("reset-error");
      if (!confirmed) {
        error.textContent = "Select the confirmation box before resetting.";
        error.hidden = false;
        return;
      }
      app.state = Storage.reset();
      app.view = "home";
      app.currentQuestId = null;
      app.celebration = null;
      document.getElementById("reset-dialog").close();
      setNotice(storageNotice, "");
      render();
      showToast("Garden progress was reset on this browser.");
    });
  }

  async function loadJSON(path) {
    const response = await fetch(path, { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`Could not load ${path}: ${response.status}`);
    }
    return response.json();
  }

  async function init() {
    bindEvents();
    try {
      const [courseTopics, worlds, quests] = await Promise.all([
        loadJSON("./data/course-topics.json"),
        loadJSON("./data/worlds.json"),
        loadJSON("./data/quests.json")
      ]);
      validateContent(courseTopics, worlds, quests);

      const worldOrders = new Map(worlds.map((world) => [world.id, world.order]));
      app.courseTopics = courseTopics.slice().sort((a, b) => a.order - b.order);
      app.worlds = worlds.slice().sort((a, b) => a.order - b.order);
      app.quests = quests
        .map((quest) => ({
          ...quest,
          worldOrder: worldOrders.get(quest.worldId)
        }))
        .sort((a, b) =>
          a.worldOrder === b.worldOrder
            ? a.order - b.order
            : a.worldOrder - b.worldOrder
        );

      const loaded = Storage.load();
      app.state = loaded.state;
      app.storageAvailable = loaded.storageAvailable;
      setNotice(storageNotice, loaded.warning);
      document.documentElement.classList.toggle(
        "reduce-motion",
        app.state.preferences.reducedMotion
      );

      if (app.state.activeQuestId && !questById(app.state.activeQuestId)) {
        app.state.activeQuestId = null;
      }
      render();
    } catch (error) {
      console.error(error);
      setNotice(
        appError,
        "The garden could not load its topic library. Please refresh the page. If this keeps happening, share the page link with the person who maintains it."
      );
      main.innerHTML = `
        <section class="fatal-card">
          <img src="./assets/tintinsito.svg" alt="" width="100" height="100">
          <h1>The garden gate is stuck.</h1>
          <p>Your browser did nothing wrong. The topic files could not be opened.</p>
          <button class="button button-primary" type="button" onclick="window.location.reload()">Try again</button>
        </section>
      `;
    }
  }

  init();
})();
