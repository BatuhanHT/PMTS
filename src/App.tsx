import { HashRouter, Navigate, Route, Routes } from 'react-router'
import { Layout } from './components/Layout.tsx'
import { Dashboard } from './pages/Dashboard.tsx'
import { ProjectDetail } from './pages/ProjectDetail.tsx'
import { Projects } from './pages/Projects.tsx'
import { Settings } from './pages/Settings.tsx'
import { StockDetail } from './pages/StockDetail.tsx'
import { StockList } from './pages/StockList.tsx'
import { Tags } from './pages/Tags.tsx'

// HashRouter: works from any static host and from file:// (desktop wrapper) without server rewrites.
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="stok" element={<StockList />} />
          <Route path="stok/:id" element={<StockDetail />} />
          <Route path="projeler" element={<Projects />} />
          <Route path="projeler/:id" element={<ProjectDetail />} />
          <Route path="etiketler" element={<Tags />} />
          <Route path="ayarlar" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
