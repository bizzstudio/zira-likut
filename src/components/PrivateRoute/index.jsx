import { useNavigate } from "react-router-dom";

export default function PrivateRoute({ children }) {
    const nav = useNavigate();
    const token = localStorage.getItem("token");

    return token ? children : nav("/login");
}
