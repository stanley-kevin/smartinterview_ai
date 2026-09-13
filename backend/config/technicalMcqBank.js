/**
 * Dynamic question generator for the Technical MCQ round.
 *
 * Fixed 15-question template (matches the platform's spec exactly):
 *   Q1-3   DBMS          (Easy, Medium, Hard)
 *   Q4-6   OS            (Easy, Medium, Hard)
 *   Q7-8   OOP           (Easy, Medium)
 *   Q9-10  CN            (Easy, Medium)
 *   Q11-13 Programming   (Easy, Medium, Hard)
 *   Q14-15 Mixed         (Medium, Hard)
 * => 5 Easy, 6 Medium, 4 Hard = 15 total.
 *
 * Conceptual categories (DBMS/OS/OOP/CN/Mixed) draw from curated banks —
 * dynamism comes from random selection plus `pickFresh` steering away from
 * a user's own recent questions. Programming questions are parametrized
 * (randomized numbers) for true per-attempt uniqueness, same approach as
 * the aptitude bank.
 */

const { randInt, randChoice, buildOptions, pickFresh } = require("./questionUtils");

const CATEGORIES = {
  dbms: "DBMS",
  os: "Operating Systems",
  oop: "OOP",
  cn: "Computer Networks",
  programming: "Programming",
  mixed: "Mixed / Advanced",
};

// ---------- DBMS ---------------------------------------------------------

const DBMS_EASY = [
  {
    id: "dbms-e1",
    prompt: "Which SQL keyword is used to remove duplicate rows from a result set?",
    correct: "DISTINCT",
    distractors: ["UNIQUE", "FILTER", "GROUP"],
    explanation: "SELECT DISTINCT removes duplicate rows from the query result.",
  },
  {
    id: "dbms-e2",
    prompt: "What does the 'A' in the ACID properties of a database transaction stand for?",
    correct: "Atomicity",
    distractors: ["Availability", "Aggregation", "Authentication"],
    explanation: "Atomicity guarantees a transaction is all-or-nothing — it either fully completes or fully rolls back.",
  },
  {
    id: "dbms-e3",
    prompt: "Which type of key uniquely identifies a row within its own table and cannot be null?",
    correct: "Primary key",
    distractors: ["Foreign key", "Candidate key", "Composite key"],
    explanation: "A primary key uniquely identifies each row and, by definition, cannot contain NULL values.",
  },
  {
    id: "dbms-e4",
    prompt: "Which SQL clause is used to filter groups after a GROUP BY, rather than individual rows?",
    correct: "HAVING",
    distractors: ["WHERE", "FILTER", "ON"],
    explanation: "WHERE filters rows before grouping; HAVING filters the grouped results afterward.",
  },
  {
    id: "dbms-e5",
    prompt: "A foreign key in one table refers to which kind of key in another table?",
    correct: "Primary key",
    distractors: ["Composite key", "Super key", "Surrogate key"],
    explanation: "A foreign key references the primary key of another (or the same) table to enforce referential integrity.",
  },
];

const DBMS_MEDIUM = [
  {
    id: "dbms-m1",
    prompt: "Which JOIN returns all rows from the left table, and matched rows from the right table (NULLs where there's no match)?",
    correct: "LEFT JOIN",
    distractors: ["INNER JOIN", "RIGHT JOIN", "CROSS JOIN"],
    explanation: "LEFT JOIN keeps every row from the left table regardless of a match on the right.",
  },
  {
    id: "dbms-m2",
    prompt: "A table is in Second Normal Form (2NF) when it is in 1NF and additionally has no:",
    correct: "Partial dependency of a non-key attribute on part of a composite key",
    distractors: [
      "Transitive dependency between non-key attributes",
      "Multi-valued dependency",
      "Repeating groups within a single column",
    ],
    explanation: "2NF eliminates partial dependencies — every non-key attribute must depend on the whole primary key, not just part of it.",
  },
  {
    id: "dbms-m3",
    prompt: "Which index structure do most relational databases use by default for fast range queries?",
    correct: "B-Tree index",
    distractors: ["Hash index", "Bitmap index", "Linked list index"],
    explanation: "B-Tree indexes keep data sorted, making them efficient for both equality and range lookups — the common default.",
  },
  {
    id: "dbms-m4",
    prompt: "What isolation level allows a transaction to read uncommitted changes made by another transaction?",
    correct: "Read Uncommitted",
    distractors: ["Read Committed", "Repeatable Read", "Serializable"],
    explanation: "Read Uncommitted is the weakest isolation level and permits 'dirty reads' of uncommitted data.",
  },
  {
    id: "dbms-m5",
    prompt: "In SQL, which command is used to permanently remove a table's structure and all its data?",
    correct: "DROP TABLE",
    distractors: ["DELETE TABLE", "TRUNCATE ROWS", "REMOVE TABLE"],
    explanation: "DROP TABLE deletes the table definition and its data entirely; DELETE only removes rows and keeps the structure.",
  },
];

const DBMS_HARD = [
  {
    id: "dbms-h1",
    prompt: "Two transactions each hold a lock the other needs, and both are waiting indefinitely. What is this called, and what's a common resolution?",
    correct: "Deadlock — detected via a wait-for graph and resolved by aborting one transaction",
    distractors: [
      "Livelock — resolved by increasing the lock timeout",
      "Starvation — resolved by disabling locking entirely",
      "Phantom read — resolved by using a stricter isolation level",
    ],
    explanation: "A deadlock is a circular wait between transactions; databases detect it (e.g. via a wait-for graph) and roll back one transaction to break the cycle.",
  },
  {
    id: "dbms-h2",
    prompt: "A query optimizer chooses a sequential scan over an available index. What is the most likely reason?",
    correct: "The query would match a large fraction of the table's rows, making an index scan less efficient",
    distractors: [
      "Indexes only work on primary keys",
      "The database has no statistics on the table",
      "Sequential scans are always faster than index scans",
    ],
    explanation: "When a large percentage of rows match, a full scan can outperform an index scan because of the overhead of random-access index lookups.",
  },
  {
    id: "dbms-h3",
    prompt: "Which concurrency control technique validates a transaction against others only at commit time, rather than locking data up front?",
    correct: "Optimistic Concurrency Control",
    distractors: ["Two-Phase Locking", "Timestamp Ordering with locks", "Strict pessimistic locking"],
    explanation: "Optimistic concurrency control assumes conflicts are rare, lets transactions proceed freely, and validates only at commit — retrying on conflict.",
  },
  {
    id: "dbms-h4",
    prompt: "In the CAP theorem, a distributed database that prioritizes Consistency and Partition tolerance over Availability is best described as:",
    correct: "A CP system — it may refuse requests during a network partition to stay consistent",
    distractors: [
      "An AP system — it always responds, possibly with stale data",
      "A CA system — it can guarantee all three simultaneously",
      "A system exempt from CAP because it uses SQL",
    ],
    explanation: "CAP theorem says a partitioned system must trade off consistency vs availability; a CP system chooses consistency, sacrificing availability during a partition.",
  },
];

// ---------- OS -------------------------------------------------------------

const OS_EASY = [
  {
    id: "os-e1",
    prompt: "What is the fundamental difference between a process and a thread?",
    correct: "A process has its own memory space; threads within a process share that memory space",
    distractors: [
      "Threads always run slower than processes",
      "A process can only run one instruction at a time, a thread cannot",
      "There is no meaningful difference between the two",
    ],
    explanation: "Processes are isolated with their own address space; threads are lighter-weight units that share the memory of their parent process.",
  },
  {
    id: "os-e2",
    prompt: "Which of these is NOT a typical state in the process lifecycle?",
    correct: "Compiled",
    distractors: ["Ready", "Running", "Waiting"],
    explanation: "Standard process states are New, Ready, Running, Waiting, and Terminated — 'Compiled' isn't a runtime process state.",
  },
  {
    id: "os-e3",
    prompt: "What is a 'context switch' in an operating system?",
    correct: "Saving the state of a running process/thread so another can run, then restoring it later",
    distractors: [
      "Switching the OS's default programming language context",
      "Changing a file's read/write permissions",
      "Restarting the operating system kernel",
    ],
    explanation: "A context switch saves the CPU state of the current task and loads the saved state of the next task, enabling multitasking.",
  },
  {
    id: "os-e4",
    prompt: "What does 'multithreading' primarily allow a single process to do?",
    correct: "Execute multiple sequences of instructions concurrently within the same memory space",
    distractors: [
      "Run on multiple operating systems simultaneously",
      "Avoid needing any memory allocation",
      "Automatically parallelize disk I/O only",
    ],
    explanation: "Multithreading lets a process run several threads that share its memory space, enabling concurrent execution of different tasks.",
  },
];

const OS_MEDIUM = [
  {
    id: "os-m1",
    prompt: "Which of the following is NOT one of the four necessary conditions for a deadlock to occur?",
    correct: "Preemption",
    distractors: ["Mutual exclusion", "Hold and wait", "Circular wait"],
    explanation: "Deadlock requires mutual exclusion, hold-and-wait, NO preemption, and circular wait — preemption being *absent* is the condition, not present.",
  },
  {
    id: "os-m2",
    prompt: "What is the key difference between paging and segmentation as memory management schemes?",
    correct: "Paging divides memory into fixed-size blocks; segmentation divides it into variable-sized logical units",
    distractors: [
      "Paging is used only for disk storage, segmentation only for RAM",
      "Segmentation eliminates the need for a page table entirely in all systems",
      "Paging and segmentation are two names for the same technique",
    ],
    explanation: "Paging uses fixed-size pages/frames for simplicity, while segmentation reflects a program's logical structure (code, data, stack) with variable sizes.",
  },
  {
    id: "os-m3",
    prompt: "Which CPU scheduling algorithm can lead to starvation of longer processes if short processes keep arriving?",
    correct: "Shortest Job First (SJF)",
    distractors: ["First Come First Served (FCFS)", "Round Robin", "Priority scheduling with aging"],
    explanation: "SJF always favors shorter jobs, so a steady stream of short jobs can indefinitely delay a longer one — a form of starvation.",
  },
  {
    id: "os-m4",
    prompt: "What problem does a semaphore primarily help solve in concurrent programming?",
    correct: "Coordinating access to a shared resource among multiple processes/threads",
    distractors: [
      "Compiling code faster",
      "Reducing the size of the executable binary",
      "Automatically detecting memory leaks",
    ],
    explanation: "A semaphore is a synchronization primitive used to control access to shared resources and coordinate concurrent execution.",
  },
];

const OS_HARD = [
  {
    id: "os-h1",
    prompt: "In virtual memory systems, which page replacement algorithm suffers from 'Belady's anomaly' (more frames can cause more page faults)?",
    correct: "FIFO (First-In-First-Out)",
    distractors: ["LRU (Least Recently Used)", "Optimal Page Replacement", "Second-Chance Algorithm"],
    explanation: "FIFO is the classic example that can exhibit Belady's anomaly; LRU and Optimal are stack algorithms and don't suffer from it.",
  },
  {
    id: "os-h2",
    prompt: "What is the core difference between a mutex and a binary semaphore, despite both having only two states?",
    correct: "A mutex has ownership — only the thread that locked it can unlock it; a semaphore has no ownership concept",
    distractors: [
      "A mutex can be shared across machines, a semaphore cannot",
      "A semaphore can only be used in kernel mode",
      "There is no real difference between them",
    ],
    explanation: "Mutexes enforce ownership (the locking thread must unlock it), while semaphores can be signaled by any thread — a subtle but important distinction.",
  },
  {
    id: "os-h3",
    prompt: "Thrashing occurs in a virtual memory system when:",
    correct: "The system spends more time swapping pages in/out than executing actual processes",
    distractors: [
      "The CPU cache is disabled",
      "A process uses only physical memory and no virtual memory",
      "Two processes share the same page table by design",
    ],
    explanation: "Thrashing happens when the degree of multiprogramming is too high relative to available memory, causing excessive paging and collapsing throughput.",
  },
];

// ---------- OOP --------------------------------------------------------

const OOP_EASY = [
  {
    id: "oop-e1",
    prompt: "Which OOP principle refers to bundling data and the methods that operate on it, while restricting direct access to some of an object's components?",
    correct: "Encapsulation",
    distractors: ["Inheritance", "Polymorphism", "Abstraction"],
    explanation: "Encapsulation hides internal state and requires interaction through well-defined methods (getters/setters, public APIs).",
  },
  {
    id: "oop-e2",
    prompt: "What is the relationship between a class and an object?",
    correct: "A class is a blueprint; an object is a specific instance created from that blueprint",
    distractors: [
      "An object is a blueprint; a class is an instance of it",
      "Classes and objects are interchangeable terms",
      "A class can only ever have one object",
    ],
    explanation: "A class defines structure and behavior; an object is a concrete instance of that class in memory.",
  },
  {
    id: "oop-e3",
    prompt: "Which OOP concept allows a child class to acquire properties and behavior from a parent class?",
    correct: "Inheritance",
    distractors: ["Encapsulation", "Abstraction", "Overloading"],
    explanation: "Inheritance lets a subclass reuse and extend the fields/methods of a superclass.",
  },
];

const OOP_MEDIUM = [
  {
    id: "oop-m1",
    prompt: "What is the key difference between method overloading and method overriding?",
    correct: "Overloading is same method name with different parameters in the same class; overriding redefines a parent's method in a subclass",
    distractors: [
      "Overloading only works with static methods; overriding only with private methods",
      "They are the same concept with different names",
      "Overriding requires different parameter lists; overloading requires identical ones",
    ],
    explanation: "Overloading is compile-time polymorphism based on differing signatures; overriding is runtime polymorphism where a subclass replaces a parent method's implementation.",
  },
  {
    id: "oop-m2",
    prompt: "What is the main practical difference between an abstract class and an interface (in languages that distinguish them)?",
    correct: "An abstract class can hold state and partial implementation; a traditional interface only declares behavior contracts",
    distractors: [
      "Interfaces can be instantiated directly, abstract classes cannot",
      "Abstract classes cannot have any methods at all",
      "There is no meaningful difference in any language",
    ],
    explanation: "Abstract classes can have constructors, fields, and partially implemented methods, while interfaces traditionally define a contract without state.",
  },
  {
    id: "oop-m3",
    prompt: "Which OOP principle is most directly demonstrated when a single method call behaves differently depending on the object's actual runtime type?",
    correct: "Polymorphism",
    distractors: ["Encapsulation", "Abstraction", "Composition"],
    explanation: "Runtime polymorphism (dynamic dispatch) is exactly this: the same call resolves to different behavior based on the object's actual class.",
  },
];

// ---------- CN -------------------------------------------------------------

const CN_EASY = [
  {
    id: "cn-e1",
    prompt: "How many layers does the OSI model have?",
    correct: "7",
    distractors: ["4", "5", "6"],
    explanation: "The OSI model has 7 layers: Physical, Data Link, Network, Transport, Session, Presentation, and Application.",
  },
  {
    id: "cn-e2",
    prompt: "Which address uniquely identifies a network interface at the hardware level and is typically burned into the NIC?",
    correct: "MAC address",
    distractors: ["IP address", "Port number", "Subnet mask"],
    explanation: "A MAC (Media Access Control) address is a hardware-level identifier assigned to a network interface.",
  },
  {
    id: "cn-e3",
    prompt: "Which protocol is responsible for translating human-readable domain names into IP addresses?",
    correct: "DNS (Domain Name System)",
    distractors: ["DHCP", "FTP", "SMTP"],
    explanation: "DNS resolves domain names like example.com into the IP addresses computers actually use to route traffic.",
  },
];

const CN_MEDIUM = [
  {
    id: "cn-m1",
    prompt: "What is the key trade-off between TCP and UDP?",
    correct: "TCP guarantees ordered, reliable delivery with more overhead; UDP is faster but offers no delivery guarantees",
    distractors: [
      "UDP is always more reliable than TCP",
      "TCP is connectionless while UDP requires a handshake",
      "There is no functional difference — only different port ranges",
    ],
    explanation: "TCP is connection-oriented with acknowledgments and retransmission; UDP is connectionless and lightweight, trading reliability for speed.",
  },
  {
    id: "cn-m2",
    prompt: "A subnet mask of 255.255.255.0 corresponds to which CIDR notation?",
    correct: "/24",
    distractors: ["/16", "/8", "/32"],
    explanation: "255.255.255.0 has 24 leading 1-bits (three full octets), which is written as /24 in CIDR notation.",
  },
  {
    id: "cn-m3",
    prompt: "What is the primary purpose of the three-way handshake in TCP?",
    correct: "To establish a reliable connection by synchronizing sequence numbers between client and server",
    distractors: [
      "To encrypt the data being transmitted",
      "To compress packets before sending",
      "To resolve the server's domain name to an IP address",
    ],
    explanation: "The SYN, SYN-ACK, ACK handshake synchronizes both sides' sequence numbers and confirms both can send and receive before data transfer begins.",
  },
];

// ---------- Mixed / Advanced ---------------------------------------------

const MIXED_MEDIUM = [
  {
    id: "mixed-m1",
    prompt: "A web app's database queries are fast individually, but the page feels slow under load. Which layer is the most likely first place to investigate?",
    correct: "Connection pooling and concurrent query throughput at the database layer",
    distractors: [
      "The CSS file size",
      "The DNS TTL configuration",
      "The client's local browser cache settings",
    ],
    explanation: "Individually-fast queries with slow behavior under load usually points to connection/thread contention rather than query logic itself.",
  },
  {
    id: "mixed-m2",
    prompt: "Which combination correctly pairs a concept with the layer/domain it belongs to: 'ACID' with ___, and 'OSI Layer 3' with ___?",
    correct: "Database transactions; Network routing",
    distractors: [
      "Operating system scheduling; Object-oriented design",
      "Network routing; Database transactions",
      "Object-oriented design; Operating system scheduling",
    ],
    explanation: "ACID describes database transaction guarantees; OSI Layer 3 is the Network layer, responsible for routing.",
  },
];

const MIXED_HARD = [
  {
    id: "mixed-h1",
    prompt: "A distributed system needs to remain available and partition-tolerant, and you're choosing between strong and eventual consistency. What's the practical consequence of choosing eventual consistency?",
    correct: "Reads may return stale data temporarily, but the system stays available during network partitions",
    distractors: [
      "Writes will always fail until the partition heals",
      "The system automatically becomes strongly consistent under load",
      "There is no difference in behavior compared to strong consistency",
    ],
    explanation: "Eventual consistency trades immediate correctness for availability — nodes converge over time, but reads can briefly see stale values.",
  },
  {
    id: "mixed-h2",
    prompt: "You're debugging a multi-threaded program with an intermittent race condition. Which technique is generally most reliable for diagnosing it?",
    correct: "Reproducing under a thread-safety analysis tool (e.g. a race detector) rather than relying on print statements",
    distractors: [
      "Adding more threads to make the bug appear more often",
      "Increasing the CPU clock speed",
      "Rewriting the code in a different programming language",
    ],
    explanation: "Race conditions are timing-dependent and often vanish under naive debugging (like added print statements); dedicated race-detection tooling instruments actual memory access order.",
  },
];

// ---------- Programming (parametrized, not a static bank) -----------------

function genProgrammingEasy() {
  const n = randInt(4, 12);
  const correct = "O(1)";
  const { options, correctIndex } = buildOptions(correct, ["O(n)", "O(log n)", "O(n^2)"]);
  return {
    id: `prog-easy-${n}`,
    category: CATEGORIES.programming,
    difficulty: "Easy",
    prompt: `An array has ${n} elements. What is the time complexity of accessing a single element by its index?`,
    options,
    correctIndex,
    explanation: "Array indexing is a direct memory-address calculation, so it takes constant time regardless of array size.",
  };
}

function genProgrammingMedium() {
  const n = randInt(50, 5000);
  const correct = "O(log n)";
  const { options, correctIndex } = buildOptions(correct, ["O(n)", "O(n log n)", "O(1)"]);
  return {
    id: `prog-medium-${n}`,
    category: CATEGORIES.programming,
    difficulty: "Medium",
    prompt: `A sorted array has ${n} elements. What is the time complexity of finding a target value using binary search?`,
    options,
    correctIndex,
    explanation: "Binary search halves the search space on each comparison, giving logarithmic time complexity.",
  };
}

function genProgrammingHard() {
  const depth = randInt(3, 5);
  const correct = `O(n^${depth})`;
  const distractors = [`O(n^${depth - 1})`, `O(n^${depth + 1})`, `O(${depth} * n)`];
  const { options, correctIndex } = buildOptions(correct, distractors);
  const loopWord = depth === 1 ? "loop" : "nested loops";
  return {
    id: `prog-hard-${depth}`,
    category: CATEGORIES.programming,
    difficulty: "Hard",
    prompt: `A function contains ${depth} ${loopWord} (each one directly inside the previous), and each loop runs n times independently with no early exit. What is the overall time complexity?`,
    options,
    correctIndex,
    explanation: `Each additional level of nesting multiplies the iteration count by n, so ${depth} nested loops each running n times gives O(n^${depth}).`,
  };
}

// ---------- assembly -------------------------------------------------------

/**
 * Fixed 15-slot template: (category bank | generator, difficulty).
 * Order matches the platform's spec exactly.
 */
function generateLocalQuestionSet(excludeIds = new Set()) {
  const pick = (bank, category, difficulty) => {
    const item = pickFresh(bank, excludeIds);
    const { options, correctIndex } = buildOptions(item.correct, item.distractors);
    return { id: item.id, category, difficulty, prompt: item.prompt, options, correctIndex, explanation: item.explanation };
  };

  const slots = [
    pick(DBMS_EASY, CATEGORIES.dbms, "Easy"),
    pick(DBMS_MEDIUM, CATEGORIES.dbms, "Medium"),
    pick(DBMS_HARD, CATEGORIES.dbms, "Hard"),
    pick(OS_EASY, CATEGORIES.os, "Easy"),
    pick(OS_MEDIUM, CATEGORIES.os, "Medium"),
    pick(OS_HARD, CATEGORIES.os, "Hard"),
    pick(OOP_EASY, CATEGORIES.oop, "Easy"),
    pick(OOP_MEDIUM, CATEGORIES.oop, "Medium"),
    pick(CN_EASY, CATEGORIES.cn, "Easy"),
    pick(CN_MEDIUM, CATEGORIES.cn, "Medium"),
    { ...genProgrammingEasy() },
    { ...genProgrammingMedium() },
    { ...genProgrammingHard() },
    pick(MIXED_MEDIUM, CATEGORIES.mixed, "Medium"),
    pick(MIXED_HARD, CATEGORIES.mixed, "Hard"),
  ];

  // Re-key with positional ids (q1..q15) for round-runner consistency, but
  // keep the original bank id inside `sourceId` for repetition-avoidance.
  return slots.map((s, i) => ({ ...s, sourceId: s.id, id: `q${i + 1}` }));
}

module.exports = { generateLocalQuestionSet, CATEGORIES };
