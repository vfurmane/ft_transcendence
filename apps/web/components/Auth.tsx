import { createContext, ReactElement, useContext, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { identifyUser } from "../helpers/identifyUser";
import { selectUserState, setUserState } from "../store/UserSlice";
import { Loading } from "./Loading";

interface AuthProps {
    children: ReactElement
}

export default function Auth({ children } : AuthProps )
{
    const dispatch = useDispatch()
    const [loading, setLoading] = useState(true);

    useEffect(() =>
    {
        const fetchUser = async () => {
            const user = await identifyUser();
            console.error("user received: ", user)
            if (user)
                dispatch(setUserState(user))
            setLoading(false)
        }
        fetchUser()
    }, [])
    if (loading) return <Loading></Loading>
    return (
        <>
            { children }
        </>
    )
}