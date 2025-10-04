# React Fundamentals

React is a JavaScript library for building user interfaces. Created by Facebook (now Meta), it has become one of the most popular frontend frameworks in modern web development.

## Core Concepts

### Components
React applications are built from components - reusable, self-contained pieces of UI. Components can be functional or class-based.

```jsx
function Welcome(props) {
  return <h1>Hello, {props.name}</h1>;
}
```

### JSX
JSX is a syntax extension that looks like HTML but works within JavaScript. It gets compiled to JavaScript function calls.

### Props
Props (short for properties) are how data flows down from parent to child components. Props are read-only and cannot be modified by the receiving component.

### State
State is data that changes over time. When state updates, React re-renders the component.

```jsx
const [count, setCount] = useState(0);
```

## Hooks

Hooks are functions that let you use React features in functional components:

### useState
Manages local component state.

### useEffect
Performs side effects like data fetching, subscriptions, or DOM manipulation.

### useContext
Accesses context values without prop drilling.

### useReducer
Alternative to useState for complex state logic.

### useMemo & useCallback
Performance optimization hooks to memoize values and functions.

## Virtual DOM

React uses a virtual DOM - a lightweight copy of the actual DOM. When state changes:
1. React updates the virtual DOM
2. Compares it with the previous version (diffing)
3. Updates only the changed parts in the real DOM (reconciliation)

This makes React very efficient.

## Component Lifecycle

Functional components with hooks:
- Mount: Component is added to DOM
- Update: State or props change
- Unmount: Component is removed

## Best Practices

- Keep components small and focused
- Use functional components with hooks
- Lift state up when needed
- Avoid prop drilling with Context
- Use keys for list items
- Follow naming conventions (PascalCase for components)

## Ecosystem

React has a rich ecosystem:
- **React Router**: Client-side routing
- **Redux/Zustand**: State management
- **Next.js**: Server-side rendering framework
- **React Query**: Data fetching and caching
- **Styled Components**: CSS-in-JS
- **Testing Library**: Component testing
