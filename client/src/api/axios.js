import axios from "axios";

const BACKEND_URL="http://localhost:8080";

const apiClient = axios.create({
    baseURL:`${BACKEND_URL}/api/v1`,
    withCredentials:true
})

export default apiClient;