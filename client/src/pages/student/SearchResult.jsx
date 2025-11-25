import { Badge } from "@/components/ui/badge";
import { Sparkles, Target } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";

const SearchResult = ({ course }) => {
  const relevanceScore = course.relevancePercentage;
  const hasAIScoring = relevanceScore !== undefined;
  
  const getRelevanceColor = (score) => {
    if (score >= 80) return "text-green-600 bg-green-50";
    if (score >= 60) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-300 py-4 gap-4">
      <Link
        to={`/course-detail/${course._id}`}
        className="flex flex-col md:flex-row gap-4 w-full md:w-auto"
      >
        <img
          src={course.courseThumbnail}
          alt="course-thumbnail"
          className="h-32 w-full md:w-56 object-cover rounded"
        />
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg md:text-xl">{course.courseTitle}</h1>
            {hasAIScoring && (
              <div className={`flex items-center px-2 py-1 rounded-full text-xs ${getRelevanceColor(relevanceScore)}`}>
                <Sparkles className="w-3 h-3 mr-1" />
                {relevanceScore}% match
              </div>
            )}
          </div>
          <p className="text-sm text-gray-600">{course.subTitle}</p>
          <p className="text-sm text-gray-700">
            Instructor: <span className="font-bold">{course.creator?.name}</span>
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Badge className="w-fit">{course.courseLevel}</Badge>
            {hasAIScoring && course.matchedTerms && course.matchedTerms.length > 0 && (
              <div className="flex items-center text-xs text-blue-600">
                <Target className="w-3 h-3 mr-1" />
                Matches: {course.matchedTerms.slice(0, 3).join(", ")}
              </div>
            )}
          </div>
        </div>
      </Link>
      <div className="mt-4 md:mt-0 md:text-right w-full md:w-auto">
        <h1 className="font-bold text-lg md:text-xl">₹{course.coursePrice}</h1>
        {hasAIScoring && course.enrolledCount && (
          <p className="text-sm text-gray-500">{course.enrolledCount} students</p>
        )}
      </div>
    </div>
  );
};

export default SearchResult;
