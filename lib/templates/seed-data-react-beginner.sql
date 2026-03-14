-- Seed data: React beginner templates (4 concepts x 4 sections = 16 rows)
-- Run in Supabase SQL Editor

INSERT INTO content_templates (technology_name, concept_key, difficulty, section_type, locale, title, body, code, quiz_options, quiz_answer, quiz_explanation, source)
VALUES
-- react-components: 2 explanation + 1 code_example + 1 quiz
('React', 'react-components', 'beginner', 'explanation', 'ko',
 'Component = UI Lego Block',
 E'## Component = UI Lego Block\n\nReact에서 컴포넌트는 화면을 구성하는 독립적인 조각이에요. 마치 레고 블록처럼, 작은 컴포넌트를 조합해서 복잡한 UI를 만들 수 있어요.\n\n### 함수형 컴포넌트\n\n현대 React에서는 함수형 컴포넌트를 사용해요.\n\n```jsx\nfunction MyButton() {\n  return <button>Click me</button>;\n}\n```\n\n### 이름 규칙\n\n컴포넌트 이름은 반드시 **PascalCase**로 작성해야 해요. React가 HTML 태그와 컴포넌트를 구분하는 기준이에요.\n\n### 단일 책임 원칙\n\n좋은 컴포넌트는 하나의 역할만 담당해요. 버튼은 버튼 역할만, 카드는 카드 역할만. 재사용성이 높아지고 테스트하기도 쉬워져요.\n\n> [React 공식 문서 - 컴포넌트](https://react.dev/learn/your-first-component)',
 NULL, NULL, NULL, NULL, 'seed'),

('React', 'react-components', 'beginner', 'explanation', 'ko',
 'Why Split Components?',
 E'## 작은 컴포넌트의 힘\n\n처음에는 하나의 큰 컴포넌트로 모든 걸 만들고 싶을 수 있어요. 하지만 컴포넌트를 작게 쪼개면 큰 장점이 있어요.\n\n### Before: 하나의 거대한 컴포넌트\n```jsx\nfunction App() {\n  return (\n    <div>\n      <header>...</header>\n      <nav>...</nav>\n      <main>100줄짜리 내용...</main>\n      <footer>...</footer>\n    </div>\n  );\n}\n```\n\n### After: 역할별로 쪼갠 컴포넌트\n```jsx\nfunction App() {\n  return (\n    <div>\n      <Header />\n      <Navigation />\n      <MainContent />\n      <Footer />\n    </div>\n  );\n}\n```\n\n쪼개면 각 부분을 독립적으로 수정할 수 있고, 다른 곳에서도 재사용할 수 있어요.\n\n> [React 공식 문서 - Thinking in React](https://react.dev/learn/thinking-in-react)',
 NULL, NULL, NULL, NULL, 'seed'),

('React', 'react-components', 'beginner', 'code_example', 'ko',
 'First React Component',
 E'가장 기본적인 React 컴포넌트를 만들어봅시다. 함수형 컴포넌트는 JSX를 반환하는 JavaScript 함수예요.',
 E'function Greeting() {\n  const name = "Vibe Coder";\n  return (\n    <div>\n      <h1>Hello, {name}!</h1>\n      <p>Welcome to React.</p>\n    </div>\n  );\n}\n\nfunction App() {\n  return (\n    <div>\n      <Greeting />\n      <Greeting />\n    </div>\n  );\n}',
 NULL, NULL, NULL, 'seed'),

('React', 'react-components', 'beginner', 'quiz_question', 'ko',
 'React Component Naming',
 E'다음 중 올바른 React 컴포넌트 이름은?',
 NULL,
 '["myButton", "MyButton", "my-button", "MY_BUTTON"]',
 1,
 E'React 컴포넌트 이름은 반드시 PascalCase(첫 글자 대문자)로 시작해야 해요. React가 소문자 태그는 HTML로, 대문자 태그는 컴포넌트로 인식하기 때문이에요.',
 'seed'),

-- jsx-syntax: 2 explanation + 1 code_example + 1 quiz
('React', 'jsx-syntax', 'beginner', 'explanation', 'ko',
 'JSX is NOT HTML',
 E'## JSX = JavaScript + XML\n\nJSX는 JavaScript 안에서 HTML처럼 보이는 코드를 작성할 수 있게 해주는 특별한 문법이에요.\n\n### HTML과 다른 점\n\n| HTML | JSX |\n|------|-----|\n| class="btn" | className="btn" |\n| for="email" | htmlFor="email" |\n| <br> | <br /> |\n\n### 중괄호 {} = JavaScript 표현식\n\nJSX 안에서 중괄호를 사용하면 JavaScript 코드를 넣을 수 있어요:\n\n```jsx\nconst name = "coder";\nreturn <h1>Hi, {name}!</h1>;\n```\n\n### 하나의 루트 요소\n\nJSX는 반드시 하나의 루트 요소로 감싸야 해요. Fragment <>...</>를 사용하세요.\n\n> [React 공식 문서 - JSX](https://react.dev/learn/writing-markup-with-jsx)',
 NULL, NULL, NULL, NULL, 'seed'),

('React', 'jsx-syntax', 'beginner', 'explanation', 'ko',
 'Conditional Rendering in JSX',
 E'## 조건에 따라 다르게 보여주기\n\nJSX 안에서 조건에 따라 다른 UI를 보여줄 수 있어요.\n\n### 1. 삼항 연산자\n```jsx\n{isLoggedIn ? <Dashboard /> : <LoginForm />}\n```\n\n### 2. 논리 AND (&&)\n```jsx\n{hasNotification && <Badge count={3} />}\n```\n\n### 3. Early return\n```jsx\nfunction UserProfile({ user }) {\n  if (!user) return <p>Loading...</p>;\n  return <h1>{user.name}</h1>;\n}\n```\n\n비유하면 비가 오면 우산, 안 오면 선글라스를 쓰는 것처럼 상황에 따라 UI를 골라요!\n\n> [React 공식 문서 - 조건부 렌더링](https://react.dev/learn/conditional-rendering)',
 NULL, NULL, NULL, NULL, 'seed'),

('React', 'jsx-syntax', 'beginner', 'code_example', 'ko',
 'JSX Expressions and Lists',
 E'JSX에서 중괄호로 변수를 삽입하고 map()으로 리스트를 렌더링하는 예시입니다.',
 E'function FruitList() {\n  const fruits = ["Apple", "Banana", "Cherry"];\n  const count = fruits.length;\n\n  return (\n    <div>\n      <h2>Fruits ({count})</h2>\n      <ul>\n        {fruits.map((fruit, index) => (\n          <li key={index}>{fruit}</li>\n        ))}\n      </ul>\n      {count > 2 && <p>Many fruits!</p>}\n    </div>\n  );\n}',
 NULL, NULL, NULL, 'seed'),

('React', 'jsx-syntax', 'beginner', 'quiz_question', 'ko',
 'JSX class attribute',
 E'JSX에서 HTML의 class 속성은 어떻게 작성해야 할까요?',
 NULL,
 '["class=\"btn\"", "className=\"btn\"", "cssClass=\"btn\"", "htmlClass=\"btn\""]',
 1,
 E'JSX에서는 class 대신 className을 사용해요. class는 JavaScript 예약어이기 때문이에요.',
 'seed'),

-- props-data-flow: 2 explanation + 1 code_example + 1 quiz
('React', 'props-data-flow', 'beginner', 'explanation', 'ko',
 'Props = Data Package',
 E'## Props로 데이터 전달하기\n\nProps는 부모 컴포넌트가 자식 컴포넌트에게 보내는 데이터 소포예요.\n\n### 기본 사용법\n\n```jsx\n<UserCard name="철수" age={25} />\n\nfunction UserCard({ name, age }) {\n  return <p>{name}님은 {age}살이에요</p>;\n}\n```\n\n### Props의 핵심 규칙: 읽기 전용!\n\nprops는 수정하면 안 돼요. 데이터는 항상 부모에서 자식 방향으로만 흘러요.\n\n### children prop\n\n```jsx\n<Card>\n  <p>이 내용이 children이에요!</p>\n</Card>\n```\n\n> [React 공식 문서 - Props](https://react.dev/learn/passing-props-to-a-component)',
 NULL, NULL, NULL, NULL, 'seed'),

('React', 'props-data-flow', 'beginner', 'explanation', 'ko',
 'Destructuring Props',
 E'## Props를 받는 두 가지 방법\n\n### 방법 1: props 객체\n```jsx\nfunction Greeting(props) {\n  return <h1>Hi, {props.name}!</h1>;\n}\n```\n\n### 방법 2: 구조 분해 할당 (추천!)\n```jsx\nfunction Greeting({ name, emoji = "wave" }) {\n  return <h1>{emoji} Hi, {name}!</h1>;\n}\n```\n\n방법 2가 더 깔끔하고 기본값 설정도 쉬워서 현대 React에서 주로 사용해요. 카페에서 사이즈를 안 말하면 기본(레귤러)이 나오는 것과 같아요!\n\n> [MDN - 구조 분해 할당](https://developer.mozilla.org/ko/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment)',
 NULL, NULL, NULL, NULL, 'seed'),

('React', 'props-data-flow', 'beginner', 'code_example', 'ko',
 'Props and Children Example',
 E'props로 데이터를 전달하고 children으로 내부 콘텐츠를 전달하는 예시입니다.',
 E'function Button({ color = "blue", size = "medium", children }) {\n  return (\n    <button\n      className={`btn btn-${color} btn-${size}`}\n      style={{ padding: size === "large" ? "16px 32px" : "8px 16px" }}\n    >\n      {children}\n    </button>\n  );\n}\n\nfunction App() {\n  return (\n    <div>\n      <Button color="green">Confirm</Button>\n      <Button color="red" size="large">Delete</Button>\n      <Button>Default Button</Button>\n    </div>\n  );\n}',
 NULL, NULL, NULL, 'seed'),

('React', 'props-data-flow', 'beginner', 'quiz_question', 'ko',
 'Props Data Flow Direction',
 E'React에서 props의 데이터 흐름 방향은?',
 NULL,
 '["Child to Parent", "Parent to Child", "Bidirectional", "Between Siblings"]',
 1,
 E'React의 props는 항상 부모에서 자식으로만 흘러요 (단방향 데이터 흐름). 디버깅이 간편해져요.',
 'seed'),

-- hooks-useState: 2 explanation + 1 code_example + 1 quiz
('React', 'hooks-useState', 'beginner', 'explanation', 'ko',
 'useState = Component Memory',
 E'## 상태(State)란?\n\n상태는 컴포넌트의 기억이에요. 버튼 클릭 횟수, 입력 내용 등을 기억하려면 상태가 필요해요.\n\n### useState 기본 패턴\n\n```jsx\nconst [count, setCount] = useState(0);\n//     값    업데이트함수    초기값\n```\n\n비유하면 count는 화이트보드에 적힌 숫자이고 setCount는 지우고 새 숫자를 적는 행위예요.\n\n### 상태가 바뀌면 = 화면이 바뀐다\n\nuseState로 상태를 업데이트하면 React가 자동으로 화면을 다시 그려요.\n\n### 주의: 비동기 업데이트\n\nsetCount(count + 1)을 호출해도 바로 값이 바뀌지 않아요. React가 여러 업데이트를 모아서 처리하기 때문이에요.\n\n> [React 공식 문서 - useState](https://react.dev/reference/react/useState)',
 NULL, NULL, NULL, NULL, 'seed'),

('React', 'hooks-useState', 'beginner', 'explanation', 'ko',
 'Immutability: Safe State Updates',
 E'## 불변성이 뭔가요?\n\n불변성은 원본을 직접 수정하지 않는 원칙이에요.\n\n### 잘못된 방법\n```jsx\nconst [items, setItems] = useState(["apple"]);\nitems.push("banana");  // 원본 수정!\nsetItems(items);       // React가 감지 못 함\n```\n\n### 올바른 방법\n```jsx\nsetItems([...items, "banana"]);  // 새 배열 생성!\n```\n\n### 객체도 마찬가지\n```jsx\nsetUser({ ...user, name: "new name" });\n```\n\nReact는 이전 값과 새 값의 참조를 비교해서 변경을 감지하기 때문에 새 객체/배열을 만들어야 해요.\n\n> [React 공식 문서 - Updating Objects in State](https://react.dev/learn/updating-objects-in-state)',
 NULL, NULL, NULL, NULL, 'seed'),

('React', 'hooks-useState', 'beginner', 'code_example', 'ko',
 'Counter and Input Form',
 E'가장 기본적인 useState 패턴: 카운터와 입력 폼.',
 E'function Counter() {\n  const [count, setCount] = useState(0);\n\n  return (\n    <div>\n      <p>Clicks: {count}</p>\n      <button onClick={() => setCount(count + 1)}>+1</button>\n      <button onClick={() => setCount(0)}>Reset</button>\n    </div>\n  );\n}\n\nfunction NameForm() {\n  const [name, setName] = useState("");\n\n  return (\n    <div>\n      <input\n        value={name}\n        onChange={(e) => setName(e.target.value)}\n        placeholder="Enter your name"\n      />\n      <p>Name: {name}</p>\n      <p>Length: {name.length}</p>\n    </div>\n  );\n}',
 NULL, NULL, NULL, 'seed'),

('React', 'hooks-useState', 'beginner', 'quiz_question', 'ko',
 'Correct Array State Update',
 E'React에서 배열 상태에 새 항목을 추가하는 올바른 방법은?',
 NULL,
 '["items.push(newItem); setItems(items);", "setItems([...items, newItem]);", "items = [...items, newItem];", "setItems(items.concat);"]',
 1,
 E'스프레드 연산자(...)로 기존 배열을 복사하고 새 항목을 추가한 새 배열을 전달해야 해요. push()로 원본을 수정하면 React가 변경을 감지하지 못해요.',
 'seed')

ON CONFLICT DO NOTHING;
