import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "@/components/Header";
import Home from "@/pages/Home";
import Templates from "@/pages/Templates";
import Diff from "@/pages/Diff";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background text-text-primary">
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/diff" element={<Diff />} />
        </Routes>
      </div>
    </Router>
  );
}