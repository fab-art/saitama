import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { PlaceholderScreen } from '@/features/placeholder/PlaceholderScreen'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<PlaceholderScreen />} />
      </Routes>
    </BrowserRouter>
  )
}
