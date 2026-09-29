#!/usr/bin/env bun
import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Helpers & Data Pools
// ---------------------------------------------------------------------------

function randomChoice<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((Math.random() * (max - min) + min) * factor) / factor;
}

function randomDate(startDaysAgo: number = 180, futureDays: number = 90): string {
  const now = Date.now();
  const pastMs = startDaysAgo * 24 * 60 * 60 * 1000;
  const futureMs = futureDays * 24 * 60 * 60 * 1000;
  const targetMs = now - pastMs + Math.random() * (pastMs + futureMs);
  return new Date(targetMs).toISOString().split('T')[0];
}

function randomMultiSelect<T>(arr: readonly T[], min: number = 1, max: number = 3): string {
  const count = randomInt(min, max);
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count).join(', ');
}

function escapeCSV(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ---------------------------------------------------------------------------
// Realistic Data Vocabularies
// ---------------------------------------------------------------------------

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Sam', 'Chris', 'Pat', 'Riley', 'Casey', 'Jesse',
  'David', 'Sarah', 'Michael', 'Emma', 'Daniel', 'Olivia', 'James', 'Sophia', 'Benjamin', 'Mia',
  'Liam', 'Charlotte', 'Ethan', 'Amelia', 'Noah', 'Harper', 'Lucas', 'Evelyn', 'Mason', 'Abigail',
  'Logan', 'Emily', 'Alexander', 'Elizabeth', 'Henry', 'Avery', 'Sebastian', 'Ella', 'Jack', 'Scarlett'
];

const LAST_NAMES = [
  'Chen', 'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez',
  'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson',
  'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis',
  'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill'
];

const COMPANIES = [
  'Acme Corp', 'Stripe', 'Linear', 'Vercel', 'Supabase', 'Figma', 'Retool', 'Datadog', 'Snowflake',
  'Notion', 'Slack', 'GitHub', 'Atlassian', 'Cloudflare', 'MongoDB', 'Twilio', 'Shopify', 'Airbnb',
  'Netflix', 'Spotify', 'Canva', 'Brex', 'Ramp', 'Scale AI', 'Anthropic', 'OpenAI', 'Databricks'
];

const TASK_VERBS = [
  'Implement', 'Refactor', 'Fix bug in', 'Design', 'Optimize', 'Migrate', 'Audit', 'Review',
  'Setup', 'Deploy', 'Configure', 'Document', 'Build', 'Integrate', 'Benchmark', 'Investigate'
];

const TASK_SUBJECTS = [
  'infinite virtual scroll query', 'multi-region database replication', 'auth token refresh flow',
  'payment gateway webhook handler', 'Kanban drag-and-drop animation', 'dark mode contrast tokens',
  'CSV bulk import parser pipeline', 'session cookie expiry policy', 'rich-text block parser',
  'WebSocket real-time collaboration', 'PostgreSQL CTE anti-join indexing', 'mobile touch gesture events',
  'SEO open-graph metadata tags', 'file upload progress indicator', 'role-based access control matrix',
  'memory leak in undo stack', 'modal backdrop blur transition', 'custom date picker popover',
  'export to PDF & Markdown engine', 'search input debounced query'
];

const TASK_TAGS = ['Frontend', 'Backend', 'Design', 'Performance', 'Bug', 'Feature', 'Security', 'Database', 'DevOps', 'Mobile', 'A11y', 'Infra'];

const PRODUCT_ADJECTIVES = ['Ultra', 'Pro', 'Max', 'Smart', 'Wireless', 'Ergonomic', 'Compact', 'Precision', 'Hyper', 'Studio', 'Elite'];
const PRODUCT_NOUNS = ['Keyboard', 'Mouse', 'Monitor 4K', 'Noise-Canceling Headset', 'USB-C Dock', 'Mechanical Switch', 'Webcam 1080p', 'Desk Mat', 'Laptop Stand', 'Microphone Boom', 'Cable Organizer', 'LED Desk Lamp'];
const PRODUCT_CATEGORIES = ['Hardware', 'Peripherals', 'Audio', 'Displays', 'Accessories', 'Power & Cables', 'Office Furniture'];

const EXPENSE_CATEGORIES = ['Software Subscriptions', 'Hardware & Equipment', 'Travel & Lodging', 'Meals & Entertainment', 'Cloud Infrastructure', 'Marketing & Ads', 'Office Supplies', 'Consulting & Legal'];
const EXPENSE_MERCHANTS = ['AWS', 'Google Cloud', 'GitHub', 'Figma', 'JetBrains', 'OpenAI', 'Uber', 'Delta Air Lines', 'WeWork', 'Apple Store', 'Starbucks', 'Slack', 'Vercel'];

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

export interface PresetDef {
  name: string;
  description: string;
  headers: string[];
  generateRow: (index: number) => any[];
}

export const PRESETS: Record<string, PresetDef> = {
  tasks: {
    name: 'tasks',
    description: 'Engineering & Project Management Tasks (Status, Priority, Assignee, Estimate, Tags, PR)',
    headers: ['Task Title', 'Status', 'Priority', 'Assignee', 'Due Date', 'Estimated Hours', 'Tags', 'Completed', 'Pull Request'],
    generateRow: (i) => {
      const verb = randomChoice(TASK_VERBS);
      const subject = randomChoice(TASK_SUBJECTS);
      const status = randomChoice(['Backlog', 'Todo', 'In Progress', 'In Review', 'Done']);
      const priority = randomChoice(['Low', 'Medium', 'High', 'Urgent']);
      const assignee = `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`;
      const dueDate = randomDate(30, 90);
      const estimate = randomInt(1, 40);
      const tags = randomMultiSelect(TASK_TAGS, 1, 3);
      const completed = status === 'Done' ? 'true' : 'false';
      const prUrl = status === 'In Review' || status === 'Done' ? `https://github.com/company/repo/pull/${randomInt(1000, 9999)}` : '';

      return [
        `[#${i + 1}] ${verb} ${subject}`,
        status,
        priority,
        assignee,
        dueDate,
        estimate,
        tags,
        completed,
        prUrl,
      ];
    },
  },

  crm: {
    name: 'crm',
    description: 'Sales & Customer Relationship Pipeline (Company, Contact, Email, Stage, Value, Industry)',
    headers: ['Company Name', 'Contact Person', 'Email', 'Stage', 'Deal Value ($)', 'Industry', 'Region', 'Expected Close', 'Active Customer'],
    generateRow: (i) => {
      const company = `${randomChoice(COMPANIES)} ${i > 27 ? `#${i + 1}` : ''}`.trim();
      const first = randomChoice(FIRST_NAMES);
      const last = randomChoice(LAST_NAMES);
      const contact = `${first} ${last}`;
      const email = `${first.toLowerCase()}.${last.toLowerCase()}@${company.toLowerCase().replace(/[^a-z0-9]/g, '') || 'example'}.com`;
      const stage = randomChoice(['Lead', 'Discovery', 'Qualified', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost']);
      const dealValue = randomInt(2500, 150000);
      const industry = randomChoice(['SaaS', 'Fintech', 'Healthcare', 'E-commerce', 'AI & ML', 'Cybersecurity', 'Edtech', 'DevTools']);
      const region = randomChoice(['North America', 'EMEA', 'APAC', 'LATAM']);
      const closeDate = randomDate(60, 120);
      const active = stage === 'Closed Won' ? 'true' : 'false';

      return [
        company,
        contact,
        email,
        stage,
        dealValue,
        industry,
        region,
        closeDate,
        active,
      ];
    },
  },

  products: {
    name: 'products',
    description: 'E-commerce & Inventory Catalog (SKU, Product Name, Category, Price, Stock, Supplier, Status)',
    headers: ['SKU', 'Product Name', 'Category', 'Unit Price ($)', 'Stock Quantity', 'Supplier', 'Status', 'Last Restocked', 'Discontinued'],
    generateRow: (i) => {
      const sku = `SKU-${100000 + i}`;
      const adj = randomChoice(PRODUCT_ADJECTIVES);
      const noun = randomChoice(PRODUCT_NOUNS);
      const prodName = `${adj} ${noun} ${String.fromCharCode(65 + (i % 26))}${randomInt(10, 99)}`;
      const category = randomChoice(PRODUCT_CATEGORIES);
      const price = randomFloat(15.99, 999.99);
      const stock = randomInt(0, 850);
      const supplier = `${randomChoice(COMPANIES)} Logistics`;
      const status = stock === 0 ? 'Out of Stock' : stock < 25 ? 'Low Stock' : 'In Stock';
      const restocked = randomDate(120, 0);
      const discontinued = Math.random() < 0.05 ? 'true' : 'false';

      return [
        sku,
        prodName,
        category,
        price,
        stock,
        supplier,
        status,
        restocked,
        discontinued,
      ];
    },
  },

  expenses: {
    name: 'expenses',
    description: 'Finance & Expense Tracker (Merchant, Description, Category, Amount, Status, Department, Date)',
    headers: ['Expense Title', 'Merchant', 'Category', 'Amount ($)', 'Department', 'Status', 'Date', 'Tax Deductible'],
    generateRow: (i) => {
      const merchant = randomChoice(EXPENSE_MERCHANTS);
      const category = randomChoice(EXPENSE_CATEGORIES);
      const amount = randomFloat(12.50, 4850.00);
      const department = randomChoice(['Engineering', 'Product', 'Sales', 'Marketing', 'Executive', 'Operations', 'Design']);
      const status = randomChoice(['Pending', 'Approved', 'Reimbursed', 'Flagged']);
      const date = randomDate(120, 0);
      const taxDeductible = Math.random() > 0.15 ? 'true' : 'false';
      const title = `${merchant} - ${category} (#${i + 1})`;

      return [
        title,
        merchant,
        category,
        amount,
        department,
        status,
        date,
        taxDeductible,
      ];
    },
  },
};

// ---------------------------------------------------------------------------
// CLI Execution
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);

  // Help flag
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
📊 Notling CSV Mock Data Generator (10k+ scale)
===============================================

Usage:
  bun run scripts/generate-csv.ts [count] [preset] [output]

Arguments:
  [count]    Number of rows to generate (default: 10000)
  [preset]   Preset schema (default: tasks)
             Available presets: ${Object.keys(PRESETS).join(', ')}
  [output]   Output filepath (default: ./samples/mock-<preset>-<count>.csv)

Examples:
  bun run scripts/generate-csv.ts 10000
  bun run scripts/generate-csv.ts 25000 crm
  bun run scripts/generate-csv.ts 50000 products ./samples/large-catalog.csv
  bun run scripts/generate-csv.ts 10000 expenses
    `);
    process.exit(0);
  }

  const rawCount = args[0] ? parseInt(args[0], 10) : 10000;
  const count = isNaN(rawCount) || rawCount <= 0 ? 10000 : rawCount;
  const presetKey = (args[1] || 'tasks').toLowerCase();
  const preset = PRESETS[presetKey] || PRESETS.tasks;

  const samplesDir = path.resolve(process.cwd(), 'samples');
  const defaultFileName = `mock-${preset.name}-${count.toLocaleString().replace(/,/g, '')}.csv`;
  const outputPath = args[2]
    ? path.resolve(process.cwd(), args[2])
    : path.join(samplesDir, defaultFileName);

  const targetDir = path.dirname(outputPath);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  console.log(`\n🚀 Generating ${count.toLocaleString()} rows for preset: "${preset.name}" (${preset.description})`);
  console.log(`📁 Target file: ${outputPath}`);

  const startTime = Date.now();
  const writeStream = fs.createWriteStream(outputPath, { encoding: 'utf-8', highWaterMark: 64 * 1024 });

  // Write CSV Header
  writeStream.write(preset.headers.map(escapeCSV).join(',') + '\n');

  // Stream rows with backpressure handling
  let i = 0;
  function writeChunk(): Promise<void> {
    return new Promise((resolve, reject) => {
      function write() {
        let ok = true;
        while (i < count && ok) {
          const row = preset.generateRow(i);
          const line = row.map(escapeCSV).join(',') + '\n';
          i++;

          if (i % 5000 === 0 || i === count) {
            process.stdout.write(`\r⏳ Generated ${i.toLocaleString()} / ${count.toLocaleString()} rows (${Math.round((i / count) * 100)}%)...`);
          }

          if (i === count) {
            writeStream.write(line, () => {
              writeStream.end();
              resolve();
            });
            return;
          } else {
            ok = writeStream.write(line);
          }
        }

        if (i < count) {
          writeStream.once('drain', write);
        }
      }

      writeStream.on('error', reject);
      write();
    });
  }

  await writeChunk();

  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(2);
  const stats = fs.statSync(outputPath);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log(`\n\n✅ Done in ${elapsedSec}s!`);
  console.log(`📄 File size: ${sizeMB} MB`);
  console.log(`💡 You can now import "${path.basename(outputPath)}" into any Notling Database using the Import Modal!`);
}

main().catch((err) => {
  console.error('\n❌ Error generating CSV:', err);
  process.exit(1);
});
