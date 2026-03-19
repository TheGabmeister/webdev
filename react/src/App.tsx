// WHY REACT?
//
// Without React, making a button update a number on screen looks like this:
//   let count = 0
//   document.getElementById('count').innerText = count
//   document.getElementById('btn').addEventListener('click', () => {
//     count++
//     document.getElementById('count').innerText = count  // you manually sync the DOM
//   })
//
// As apps grow, manually keeping the DOM in sync with your data becomes
// messy and error-prone. React solves this with a simple rule:
//
//   "Describe what the UI should look like for a given state.
//    React will update the DOM automatically when the state changes."
//
// That's it. You write: "when count is 5, show the number 5."
// React handles actually changing the DOM.

import { useState } from 'react'

// A "component" is just a function that returns JSX (HTML-like syntax).
// JSX lets you write UI structure directly in your TypeScript file.
export default function App() {

  // useState is how you store data that can change.
  // - `count` is the current value
  // - `setCount` is the function you call to change it
  // When you call setCount(), React automatically re-renders this component.
  const [count, setCount] = useState(0)

  // This JSX describes what the UI looks like RIGHT NOW.
  // React re-runs this function and updates the DOM whenever count changes.
  return (
    <div style={{ fontFamily: 'sans-serif', textAlign: 'center', marginTop: '4rem' }}>
      <h1>React Counter</h1>
      <p>This is a React component. Click the buttons to change the count.</p>

      {/* The current count is displayed here. React keeps this in sync automatically. */}
      <p style={{ fontSize: '3rem', fontWeight: 'bold' }}>{count}</p>

      <button onClick={() => setCount(count - 1)} style={btnStyle}>− Decrement</button>
      <button onClick={() => setCount(0)}         style={{ ...btnStyle, margin: '0 0.5rem' }}>Reset</button>
      <button onClick={() => setCount(count + 1)} style={btnStyle}>+ Increment</button>

      <p style={{ color: '#888', marginTop: '2rem', fontSize: '0.9rem' }}>
        {count === 0 && 'Count is zero.'}
        {count > 0  && `Counted up ${count} time${count === 1 ? '' : 's'}.`}
        {count < 0  && `Counted down ${Math.abs(count)} time${count === -1 ? '' : 's'}.`}
      </p>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  padding: '0.5rem 1.25rem',
  fontSize: '1rem',
  cursor: 'pointer',
  borderRadius: '6px',
  border: '1px solid #ccc',
}
