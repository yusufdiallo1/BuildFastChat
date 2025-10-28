import Sidebar from './Sidebar'
import MainChat from './MainChat'

function Layout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <MainChat />
    </div>
  )
}

export default Layout


