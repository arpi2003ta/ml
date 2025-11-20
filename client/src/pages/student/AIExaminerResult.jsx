import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const AIExaminerResult=()=>{
    const fetchedData = [
        { subject: "Physics", marks: 95 },
        { subject: "Chemistry", marks: 88 },
        { subject: "Biology", marks: 92 },
    ];
    const totalMarks = fetchedData.reduce((total, item) => total + item.marks, 0);
    return (
        <div className="flex flex-col justify-center items-center mt-20 p-4">
            <div className="w-full dark:bg-white bg-gray-800 max-w-2xl rounded-xl shadow-xl text-center"> 
                <h1 className="text-3xl font-bold text-white dark:text-gray-800 mb-2">
                    Result
                </h1>
                <h2 className="text-2xl font-bold text-green-600 dark:text-green-400 mb-2">
                    Congratulations! You have Scored:
                </h2>
                <div className="grid grid-cols-2 mx-28 bg-white dark:bg-gray-800 rounded-md mt-4">
                    <div className="text-lg font-bold">Subject</div>
                    <div className="text-lg font-bold">Marks</div>

                </div>

                <div className="text-white dark:text-gray-800">
                    {fetchedData.map((item) => (
                        <div key={item.subject} className="grid mx-28 grid-cols-2 border-b dark:border-gray-200">
                            <div className="text-lg font-semibold p-2">{item.subject}</div>
                            <div className=" font-semibold p-2">{item.marks}</div>
                        </div>
                    ))}
                </div>
                <div className="text-white dark:text-gray-800 mx-28 mt-4">
                    <div className="grid grid-cols-2">
                        <div className="text-lg font-semibold p-2">Total</div>
                        <div className=" font-semibold p-2">{totalMarks}/720</div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AIExaminerResult