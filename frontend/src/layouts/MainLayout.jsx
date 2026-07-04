import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { authAPI } from "../utils/api";
import { redirectToWelcomeAuth } from "../utils/authRedirect";

const MainLayout = () => {
  const navigate = useNavigate();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let active = true;

    async function verifyAuth() {
      try {
        await authAPI.me();
        if (!active) return;
        setIsAuthorized(true);
      } catch (error) {
        if (!active) return;
        if (error.status === 401 || error.message === "API request failed") {
          redirectToWelcomeAuth(navigate);
        }
      } finally {
        if (active) {
          setCheckingAuth(false);
        }
      }
    }

    verifyAuth();

    return () => {
      active = false;
    };
  }, [navigate]);

  if (checkingAuth || !isAuthorized) {
    return null;
  }

  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
};

export default MainLayout;
