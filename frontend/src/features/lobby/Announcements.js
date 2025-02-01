import React from "react";

export const Announcements = ({plugin}) => {
    console.log("Announcements", plugin, plugin?.announcements)
    return(
        <div className="text-white rounded-lg bg-gray-600-30 flex justify-center w-full my-2" style={{maxWidth: "600px"}}>
            <div className="w-full h-32 max-h-32 overflow-y-scroll text-lg" style={{textIndent: "-20px", paddingLeft: "30px"}}>
                {plugin?.announcements?.map((announcement, index) => (
                    <div key={index}>{announcement}</div>
                ))}
            </div>
        </div>
    )
}
