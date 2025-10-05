# Cosmic Canvas

AI-powered document indexing and visualization platform built with TanStack Start, LangChain, and TLDraw.

## Overview

Cosmic Canvas is an intelligent document management system that combines:
- **LangChain** for AI-powered document indexing and semantic search
- **TLDraw** for infinite canvas visualization
- **TanStack Start** for full-stack React framework
- **OpenAI Embeddings** for semantic understanding

## Features

- 📚 **Document Indexing**: Index multiple documents with AI-powered chunking
- 🔍 **Semantic Search**: Find relevant documents based on meaning, not just keywords
- 🎨 **Infinite Canvas**: Visualize document relationships on an interactive canvas
- 🔗 **Link Discovery**: Automatically discover and visualize connections between documents
- 📊 **Bibliography Generation**: Create visual bibliographies with content and links

# Getting Started

To run this application:

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:3000`

## Chroma Vector Database Setup

Cosmic Canvas uses a persistent [Chroma](https://docs.trychroma.com/) vector database to store document embeddings. A Docker configuration is included so you can spin up a local instance quickly.

### 1. Prepare your environment

- Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Docker Compose v2 is required).
- Copy the example environment file and add your secrets:

```bash
cp .env.example .env
# Edit .env and set OPENAI_API_KEY (and optionally CHROMA_URL)
```

If you expose Chroma on a different host or port, update `CHROMA_URL` accordingly.

### 2. Start Chroma

```bash
npm run chroma:start
```

This boots the container defined in `infra/chroma/docker-compose.yml` and persists data in the local `chroma_db/` directory (ignored by git).

### 3. Verify the connection

```bash
npm run chroma:status
```

The script pings the collection `cosmic-canvas-documents` and reports the current document count. Once it succeeds, the app and CLI tools can index documents using the running Chroma instance.

### 4. Shut Chroma down (optional)

```bash
npm run chroma:stop
```

For production deployments you can point `CHROMA_URL` at a managed Chroma service or another self-hosted deployment.

## Using Cosmic Canvas

1. **Navigate to the Canvas**: Click "Open Cosmic Canvas" on the homepage or go to `/canvas`

2. **Set up your OpenAI API Key**:
   - Get an API key from [OpenAI](https://platform.openai.com/api-keys)
   - Enter it in the API Key field

3. **Index Documents**:
   - Use the provided `sample-documents.json` or create your own
   - Documents should be in this format:
   ```json
   [
     {
       "content": "Your document text here...",
       "metadata": {
         "source": "unique-id",
         "title": "Document Title",
         "type": "article",
         "timestamp": 1704067200000
       }
     }
   ]
   ```
   - Paste the JSON into the text area and click "Index Documents"

4. **Search and Visualize**:
   - Enter a search query (e.g., "machine learning", "vector databases")
   - Click "Search & Generate Canvas"
   - Explore the interactive canvas showing related documents
   - Documents are connected based on semantic similarity

5. **Interact with the Canvas**:
   - Pan: Click and drag
   - Zoom: Mouse wheel or pinch gesture
   - Select: Click on document nodes
   - Edit: Use TLDraw tools to annotate

## Architecture

```
src/
├── lib/
│   └── document-indexer.ts    # LangChain document indexing service
├── components/
│   └── DocumentCanvas.tsx      # TLDraw canvas component
├── routes/
│   ├── canvas.tsx             # Main canvas page
│   └── api/
│       ├── index-documents.ts # Document indexing endpoint
│       ├── search.ts          # Search endpoint
│       └── canvas-data.ts     # Canvas data endpoint
└── db-collections/
    └── index.ts               # TanStack DB collections
```

## API Endpoints

- `POST /api/index-documents` - Index documents with LangChain
- `POST /api/search` - Search indexed documents
- `POST /api/canvas-data` - Get graph data for canvas visualization

## 🧪 Testing

### Integration Tests

Run real API integration tests with actual OpenAI embeddings:

```bash
# Set your API key in .env
OPENAI_API_KEY=sk-your-key-here

# Run integration tests
npm run test:integration
```

The tests verify:
- ✅ Real document indexing with embeddings
- ✅ Semantic search accuracy
- ✅ Document chunking
- ✅ Graph relationship building
- ✅ Multi-document synthesis

### Interactive AI CLI

Test the AI system interactively from your terminal:

```bash
npm run ai-cli
```

#### CLI Commands

**Indexing & Search:**
- `load` - Load documents from a folder (supports .txt, .md, .json)
- `search` - Semantic search across indexed documents
- `graph` - Visualize document relationships

**AI Agent (Synthesis & Analysis):**
- `synthesize` - Generate comprehensive descriptions from all relevant documents
- `ask` - Ask questions and get AI-powered answers
- `compare` - Compare and contrast multiple topics
- `summarize` - Create detailed summaries of topics

**Utilities:**
- `stats` - Show indexing statistics
- `clear` - Clear all indexed documents
- `help` - Show available commands
- `exit` - Exit the CLI

#### Example Workflow

```bash
# Start the CLI
npm run ai-cli

# Load test documents
cosmic-canvas> load
Enter folder path: ./test-docs

# Search for documents
cosmic-canvas> search
Enter search query: machine learning
Number of results: 5

# Get AI-powered comprehensive synthesis
cosmic-canvas> synthesize
Enter topic: artificial intelligence and machine learning

# Ask specific questions
cosmic-canvas> ask
Enter your question: What are the main types of machine learning?

# Compare topics
cosmic-canvas> compare
Enter topics to compare: machine learning, deep learning, neural networks

# Summarize a topic
cosmic-canvas> summarize
Enter topic to summarize: vector databases
```

## 🎯 How It Works

### Document Indexing Flow

1. **Load Documents**: Documents are loaded from files (.txt, .md, .json)
2. **Chunk Text**: RecursiveCharacterTextSplitter breaks documents into ~1000 char chunks with 200 char overlap
3. **Generate Embeddings**: OpenAI **text-embedding-3-large** converts chunks to 3072-dimensional vectors
4. **Store in Vector DB**: MemoryVectorStore indexes embeddings for fast similarity search
5. **Build Graph**: Related documents are connected based on semantic similarity

### AI Agent Synthesis

The AI agent uses a multi-step process:

1. **Retrieval**: Search for top 20 most relevant document chunks
2. **Context Building**: Combine retrieved chunks with metadata
3. **LLM Synthesis**: **GPT-5** (released August 2025) analyzes all information and generates comprehensive response
4. **Iterative Refinement** (optional): Agent identifies gaps and retrieves additional information
5. **Source Attribution**: Track which documents contributed to the response

# Building For Production

To build this application for production:

```bash
npm run build
```

## Testing

This project uses [Vitest](https://vitest.dev/) for testing. You can run the tests with:

```bash
npm run test
```

## Styling

This project uses [Tailwind CSS](https://tailwindcss.com/) for styling.


## Linting & Formatting

This project uses [Biome](https://biomejs.dev/) for linting and formatting. The following scripts are available:


```bash
npm run lint
npm run format
npm run check
```


## Shadcn

Add components using the latest version of [Shadcn](https://ui.shadcn.com/).

```bash
pnpx shadcn@latest add button
```



## Routing
This project uses [TanStack Router](https://tanstack.com/router). The initial setup is a file based router. Which means that the routes are managed as files in `src/routes`.

### Adding A Route

To add a new route to your application just add another a new file in the `./src/routes` directory.

TanStack will automatically generate the content of the route file for you.

Now that you have two routes you can use a `Link` component to navigate between them.

### Adding Links

To use SPA (Single Page Application) navigation you will need to import the `Link` component from `@tanstack/react-router`.

```tsx
import { Link } from "@tanstack/react-router";
```

Then anywhere in your JSX you can use it like so:

```tsx
<Link to="/about">About</Link>
```

This will create a link that will navigate to the `/about` route.

More information on the `Link` component can be found in the [Link documentation](https://tanstack.com/router/v1/docs/framework/react/api/router/linkComponent).

### Using A Layout

In the File Based Routing setup the layout is located in `src/routes/__root.tsx`. Anything you add to the root route will appear in all the routes. The route content will appear in the JSX where you use the `<Outlet />` component.

Here is an example layout that includes a header:

```tsx
import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

import { Link } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: () => (
    <>
      <header>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/about">About</Link>
        </nav>
      </header>
      <Outlet />
      <TanStackRouterDevtools />
    </>
  ),
})
```

The `<TanStackRouterDevtools />` component is not required so you can remove it if you don't want it in your layout.

More information on layouts can be found in the [Layouts documentation](https://tanstack.com/router/latest/docs/framework/react/guide/routing-concepts#layouts).


## Data Fetching

There are multiple ways to fetch data in your application. You can use TanStack Query to fetch data from a server. But you can also use the `loader` functionality built into TanStack Router to load the data for a route before it's rendered.

For example:

```tsx
const peopleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/people",
  loader: async () => {
    const response = await fetch("https://swapi.dev/api/people");
    return response.json() as Promise<{
      results: {
        name: string;
      }[];
    }>;
  },
  component: () => {
    const data = peopleRoute.useLoaderData();
    return (
      <ul>
        {data.results.map((person) => (
          <li key={person.name}>{person.name}</li>
        ))}
      </ul>
    );
  },
});
```

Loaders simplify your data fetching logic dramatically. Check out more information in the [Loader documentation](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading#loader-parameters).

### React-Query

React-Query is an excellent addition or alternative to route loading and integrating it into you application is a breeze.

First add your dependencies:

```bash
npm install @tanstack/react-query @tanstack/react-query-devtools
```

Next we'll need to create a query client and provider. We recommend putting those in `main.tsx`.

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ...

const queryClient = new QueryClient();

// ...

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);

  root.render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
```

You can also add TanStack Query Devtools to the root route (optional).

```tsx
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <ReactQueryDevtools buttonPosition="top-right" />
      <TanStackRouterDevtools />
    </>
  ),
});
```

Now you can use `useQuery` to fetch your data.

```tsx
import { useQuery } from "@tanstack/react-query";

import "./App.css";

function App() {
  const { data } = useQuery({
    queryKey: ["people"],
    queryFn: () =>
      fetch("https://swapi.dev/api/people")
        .then((res) => res.json())
        .then((data) => data.results as { name: string }[]),
    initialData: [],
  });

  return (
    <div>
      <ul>
        {data.map((person) => (
          <li key={person.name}>{person.name}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;
```

You can find out everything you need to know on how to use React-Query in the [React-Query documentation](https://tanstack.com/query/latest/docs/framework/react/overview).

## State Management

Another common requirement for React applications is state management. There are many options for state management in React. TanStack Store provides a great starting point for your project.

First you need to add TanStack Store as a dependency:

```bash
npm install @tanstack/store
```

Now let's create a simple counter in the `src/App.tsx` file as a demonstration.

```tsx
import { useStore } from "@tanstack/react-store";
import { Store } from "@tanstack/store";
import "./App.css";

const countStore = new Store(0);

function App() {
  const count = useStore(countStore);
  return (
    <div>
      <button onClick={() => countStore.setState((n) => n + 1)}>
        Increment - {count}
      </button>
    </div>
  );
}

export default App;
```

One of the many nice features of TanStack Store is the ability to derive state from other state. That derived state will update when the base state updates.

Let's check this out by doubling the count using derived state.

```tsx
import { useStore } from "@tanstack/react-store";
import { Store, Derived } from "@tanstack/store";
import "./App.css";

const countStore = new Store(0);

const doubledStore = new Derived({
  fn: () => countStore.state * 2,
  deps: [countStore],
});
doubledStore.mount();

function App() {
  const count = useStore(countStore);
  const doubledCount = useStore(doubledStore);

  return (
    <div>
      <button onClick={() => countStore.setState((n) => n + 1)}>
        Increment - {count}
      </button>
      <div>Doubled - {doubledCount}</div>
    </div>
  );
}

export default App;
```

We use the `Derived` class to create a new store that is derived from another store. The `Derived` class has a `mount` method that will start the derived store updating.

Once we've created the derived store we can use it in the `App` component just like we would any other store using the `useStore` hook.

You can find out everything you need to know on how to use TanStack Store in the [TanStack Store documentation](https://tanstack.com/store/latest).

# Demo files

Files prefixed with `demo` can be safely deleted. They are there to provide a starting point for you to play around with the features you've installed.

# Learn More

You can learn more about all of the offerings from TanStack in the [TanStack documentation](https://tanstack.com).
