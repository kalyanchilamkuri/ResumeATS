/**
 * constants.js
 * Comprehensive reference data for the ATS scoring engine.
 * All lists are curated from real-world ATS best practices and recruiter feedback.
 */

// ─── STRONG ACTION VERBS ─────────────────────────────────────────────────────
// Categorized verbs that signal impact and ownership on a resume.
const STRONG_ACTION_VERBS = {
  leadership: [
    'Spearheaded', 'Orchestrated', 'Championed', 'Directed', 'Mentored',
    'Delegated', 'Steered', 'Oversaw', 'Supervised', 'Coordinated'
  ],
  achievement: [
    'Accelerated', 'Exceeded', 'Surpassed', 'Boosted', 'Maximized',
    'Outperformed', 'Delivered', 'Achieved', 'Attained', 'Earned'
  ],
  technical: [
    'Architected', 'Engineered', 'Automated', 'Debugged', 'Integrated',
    'Optimized', 'Deployed', 'Configured', 'Refactored', 'Migrated',
    'Diagnosed', 'Programmed'
  ],
  creation: [
    'Pioneered', 'Launched', 'Conceptualized', 'Designed', 'Founded',
    'Devised', 'Built', 'Created', 'Developed', 'Established',
    'Initiated', 'Introduced'
  ],
  improvement: [
    'Streamlined', 'Enhanced', 'Revamped', 'Modernized', 'Consolidated',
    'Restructured', 'Transformed', 'Upgraded', 'Simplified', 'Strengthened'
  ],
  analysis: [
    'Analyzed', 'Assessed', 'Evaluated', 'Investigated', 'Researched',
    'Identified', 'Discovered', 'Mapped', 'Audited', 'Benchmarked'
  ],
  communication: [
    'Negotiated', 'Persuaded', 'Facilitated', 'Partnered', 'Liaised',
    'Articulated', 'Advocated', 'Presented', 'Published', 'Authored'
  ],
  impact: [
    'Reduced', 'Increased', 'Improved', 'Saved', 'Generated',
    'Grew', 'Expanded', 'Eliminated', 'Minimized', 'Doubled',
    'Tripled', 'Cut'
  ]
};

// Flat array of ALL strong verbs, lowercased for matching
const ALL_STRONG_VERBS = Object.values(STRONG_ACTION_VERBS)
  .flat()
  .map(v => v.toLowerCase());

// ─── WEAK PHRASES ────────────────────────────────────────────────────────────
// Phrases that weaken resume impact. Each has a concrete replacement suggestion.
const WEAK_PHRASES = [
  { pattern: 'helped with', suggestion: 'Facilitated, Contributed to, Supported' },
  { pattern: 'responsible for', suggestion: 'Managed, Led, Directed, Oversaw' },
  { pattern: 'worked on', suggestion: 'Developed, Engineered, Executed, Delivered' },
  { pattern: 'assisted in', suggestion: 'Collaborated on, Contributed to, Supported' },
  { pattern: 'was involved in', suggestion: 'Drove, Spearheaded, Participated in' },
  { pattern: 'dealt with', suggestion: 'Resolved, Managed, Addressed, Handled' },
  { pattern: 'took care of', suggestion: 'Managed, Maintained, Administered' },
  { pattern: 'in charge of', suggestion: 'Led, Managed, Directed, Oversaw' },
  { pattern: 'tasked with', suggestion: 'Executed, Delivered, Accomplished' },
  { pattern: 'participated in', suggestion: 'Contributed to, Drove, Supported' },
  { pattern: 'played a role', suggestion: 'Contributed to, Influenced, Drove' },
  { pattern: 'had to', suggestion: '(Remove and use a direct action verb)' },
  { pattern: 'was able to', suggestion: '(Remove and use a direct action verb)' },
  { pattern: 'utilized', suggestion: 'Used, Leveraged, Applied, Employed' },
  { pattern: 'did research', suggestion: 'Researched, Investigated, Analyzed' }
];

// ─── SECTION VARIANTS ────────────────────────────────────────────────────────
// Maps canonical section names to all known heading variants an ATS might encounter.
const SECTION_VARIANTS = {
  experience: [
    'experience', 'work experience', 'professional experience', 'employment',
    'employment history', 'work history', 'career history', 'relevant experience'
  ],
  education: [
    'education', 'academic background', 'academic history',
    'educational background', 'qualifications'
  ],
  skills: [
    'skills', 'technical skills', 'core competencies', 'competencies',
    'technologies', 'tools', 'proficiencies', 'areas of expertise'
  ],
  projects: [
    'projects', 'personal projects', 'selected projects', 'key projects',
    'notable projects', 'academic projects'
  ],
  summary: [
    'summary', 'professional summary', 'objective', 'career objective',
    'profile', 'about me', 'about', 'career summary'
  ],
  certifications: [
    'certifications', 'certificates', 'licenses', 'credentials',
    'professional certifications'
  ],
  awards: [
    'awards', 'honors', 'achievements', 'recognition', 'accomplishments'
  ],
  publications: [
    'publications', 'papers', 'research', 'research papers'
  ],
  volunteer: [
    'volunteer', 'volunteer experience', 'community involvement', 'volunteering'
  ]
};

// ─── STOPWORDS ───────────────────────────────────────────────────────────────
// Comprehensive English stopwords list (~175 words) for keyword extraction filtering.
const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'also', 'am', 'an',
  'and', 'any', 'are', 'aren\'t', 'as', 'at', 'be', 'because', 'been', 'before',
  'being', 'below', 'between', 'both', 'but', 'by', 'can', 'can\'t', 'cannot',
  'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing',
  'don\'t', 'down', 'during', 'each', 'etc', 'even', 'every', 'few', 'for',
  'from', 'further', 'get', 'gets', 'got', 'had', 'hadn\'t', 'has', 'hasn\'t',
  'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s', 'her', 'here',
  'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'i',
  'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it',
  'it\'s', 'its', 'itself', 'just', 'let', 'let\'s', 'like', 'make', 'may',
  'me', 'might', 'more', 'most', 'much', 'must', 'mustn\'t', 'my', 'myself',
  'need', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or',
  'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'per',
  'please', 'really', 'same', 'shall', 'shan\'t', 'she', 'she\'d', 'she\'ll',
  'she\'s', 'should', 'shouldn\'t', 'so', 'some', 'still', 'such', 'take',
  'than', 'that', 'that\'s', 'the', 'their', 'theirs', 'them', 'themselves',
  'then', 'there', 'there\'s', 'therefore', 'these', 'they', 'they\'d',
  'they\'ll', 'they\'re', 'they\'ve', 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up', 'upon', 'us', 'use', 'used', 'using', 'very', 'via',
  'want', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll', 'we\'re', 'we\'ve',
  'well', 'were', 'weren\'t', 'what', 'what\'s', 'when', 'when\'s', 'where',
  'where\'s', 'which', 'while', 'who', 'who\'s', 'whom', 'why', 'why\'s',
  'will', 'with', 'within', 'without', 'won\'t', 'would', 'wouldn\'t', 'yet',
  'you', 'you\'d', 'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours',
  'yourself', 'yourselves',
  // Additional common filler words
  'able', 'across', 'already', 'among', 'another', 'anyone', 'anything',
  'around', 'away', 'back', 'become', 'becomes', 'became', 'begin', 'best',
  'better', 'big', 'bring', 'came', 'come', 'comes', 'coming', 'consider',
  'day', 'days', 'done', 'due', 'either', 'end', 'ensure', 'ever', 'example',
  'experience', 'find', 'first', 'follow', 'following', 'found', 'full',
  'give', 'given', 'go', 'going', 'gone', 'good', 'great', 'help', 'high',
  'include', 'including', 'keep', 'know', 'known', 'last', 'least', 'left',
  'less', 'long', 'look', 'looking', 'made', 'many', 'new', 'next', 'number',
  'often', 'old', 'one', 'order', 'part', 'place', 'provide', 'put', 'rather',
  'right', 'said', 'say', 'see', 'seem', 'set', 'several', 'show', 'since',
  'small', 'start', 'state', 'thing', 'things', 'think', 'time', 'together',
  'toward', 'towards', 'try', 'turn', 'two', 'three', 'type', 'way', 'ways',
  'whether', 'work', 'working', 'world', 'year', 'years'
]);

// ─── TECH SKILLS ─────────────────────────────────────────────────────────────
// ~200 common tech skills/tools used for keyword categorization.
const TECH_SKILLS = new Set([
  'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'ruby', 'go',
  'rust', 'swift', 'kotlin', 'php', 'html', 'css', 'sql', 'nosql', 'react',
  'angular', 'vue', 'svelte', 'next.js', 'node.js', 'express', 'django',
  'flask', 'spring', 'rails', 'laravel', 'aws', 'azure', 'gcp', 'docker',
  'kubernetes', 'terraform', 'jenkins', 'git', 'github', 'gitlab', 'jira',
  'confluence', 'figma', 'sketch', 'photoshop', 'mongodb', 'postgresql',
  'mysql', 'redis', 'elasticsearch', 'kafka', 'rabbitmq', 'graphql', 'rest',
  'grpc', 'webpack', 'babel', 'npm', 'yarn', 'pip', 'maven', 'gradle',
  'linux', 'unix', 'bash', 'powershell', 'nginx', 'apache', 'machine learning',
  'deep learning', 'tensorflow', 'pytorch', 'pandas', 'numpy', 'scikit-learn',
  'spark', 'hadoop', 'airflow', 'tableau', 'power bi', 'excel', 'agile',
  'scrum', 'kanban', 'ci/cd', 'devops', 'microservices', 'serverless',
  'lambda', 's3', 'ec2', 'rds', 'dynamodb', 'cloudformation', 'ansible',
  'puppet', 'chef', 'prometheus', 'grafana', 'splunk', 'datadog', 'new relic',
  'cypress', 'selenium', 'jest', 'mocha', 'pytest', 'junit', 'postman',
  'swagger', 'openapi', 'oauth', 'jwt', 'saml', 'ldap', 'ssl', 'tls',
  'tcp/ip', 'http', 'websocket', 'sass', 'less', 'tailwind', 'bootstrap',
  'material ui', 'ant design', 'storybook', 'redux', 'mobx', 'zustand',
  'rxjs', 'socket.io', 'firebase', 'supabase', 'vercel', 'netlify', 'heroku',
  'digitalocean', 'linode', 'vagrant', 'virtualbox', 'vmware', 'ios',
  'android', 'react native', 'flutter', 'xamarin', 'unity', 'unreal',
  'blockchain', 'solidity', 'web3', 'wasm', 'assembly', 'matlab', 'r',
  'stata', 'sas', 'spss', 'latex', 'markdown',
  // Additional commonly requested skills
  'fastapi', 'nestjs', 'deno', 'bun', 'vite', 'rollup', 'parcel', 'esbuild',
  'prisma', 'sequelize', 'typeorm', 'drizzle', 'knex', 'mongoose', 'cassandra',
  'couchdb', 'neo4j', 'influxdb', 'timescaledb', 'snowflake', 'bigquery',
  'redshift', 'databricks', 'dbt', 'looker', 'metabase', 'superset',
  'kubernetes', 'helm', 'istio', 'envoy', 'consul', 'vault', 'packer',
  'pulumi', 'cdk', 'sam', 'cloudwatch', 'sqs', 'sns', 'kinesis', 'step functions',
  'ecs', 'eks', 'fargate', 'aks', 'gke', 'cloud run', 'cloud functions',
  'azure functions', 'openshift', 'rancher', 'argocd', 'fluxcd', 'tekton',
  'circleci', 'github actions', 'gitlab ci', 'travis ci', 'buildkite',
  'sonarqube', 'snyk', 'trivy', 'owasp', 'burp suite', 'nmap',
  'playwright', 'puppeteer', 'k6', 'locust', 'gatling', 'jmeter',
  'webpack', 'vitest', 'testing library', 'enzyme', 'chai', 'sinon',
  'numpy', 'scipy', 'matplotlib', 'seaborn', 'plotly', 'dask', 'ray',
  'mlflow', 'kubeflow', 'sagemaker', 'hugging face', 'transformers',
  'langchain', 'openai', 'llm', 'rag', 'vector database', 'pinecone',
  'weaviate', 'chromadb', 'milvus', 'qdrant',
  'three.js', 'd3.js', 'chart.js', 'leaflet', 'mapbox',
  'electron', 'tauri', 'capacitor', 'ionic', 'expo',
  'objective-c', 'dart', 'scala', 'clojure', 'elixir', 'erlang', 'haskell',
  'lua', 'perl', 'fortran', 'cobol', 'groovy', 'zig',
  'protobuf', 'thrift', 'avro', 'json', 'xml', 'yaml', 'toml',
  'oauth2', 'openid connect', 'kerberos', 'active directory',
  'terraform cloud', 'spacelift', 'atlantis'
]);

// ─── ATS RISK PATTERNS ──────────────────────────────────────────────────────
// LaTeX commands/environments that commonly cause ATS parsing failures.
// Each has an associated point penalty and explanatory message.
const ATS_RISK_PATTERNS = [
  {
    pattern: '\\begin{multicols}',
    penalty: 15,
    message: 'Multi-column layout may break ATS parsers'
  },
  {
    pattern: '\\begin{minipage}',
    penalty: 10,
    message: 'Minipage layout can confuse ATS text extraction'
  },
  {
    pattern: '\\includegraphics',
    penalty: 10,
    message: 'Embedded images are invisible to ATS parsers'
  },
  {
    pattern: '\\begin{tikzpicture}',
    penalty: 10,
    message: 'TikZ graphics are invisible to ATS parsers'
  },
  {
    pattern: '\\begin{tabular}',
    penalty: 5,
    message: 'Tables may not parse correctly in some ATS systems'
  },
  {
    pattern: '\\fancyhead',
    penalty: 5,
    message: 'Custom headers may not be read by ATS parsers'
  },
  {
    pattern: '\\fancyfoot',
    penalty: 5,
    message: 'Custom footers may not be read by ATS parsers'
  },
  {
    pattern: '\\fontspec',
    penalty: 3,
    message: 'Custom fonts may not render in ATS systems'
  },
  {
    pattern: '\\color{',
    penalty: 3,
    message: 'Colored text may be invisible on some ATS parsers'
  },
  {
    pattern: '\\columnbreak',
    penalty: 5,
    message: 'Column breaks indicate multi-column layout (ATS risk)'
  },
  {
    pattern: '\\paracol',
    penalty: 15,
    message: 'Parallel columns will likely break ATS parsing'
  },
  {
    pattern: '\\sidebar',
    penalty: 10,
    message: 'Sidebar layouts are often missed by ATS parsers'
  }
];

module.exports = {
  STRONG_ACTION_VERBS,
  ALL_STRONG_VERBS,
  WEAK_PHRASES,
  SECTION_VARIANTS,
  STOPWORDS,
  TECH_SKILLS,
  ATS_RISK_PATTERNS
};
