export const formatDuration = (totalDuration) => {
    if (typeof totalDuration !== 'number' || isNaN(totalDuration)) return "00:00:00";
    
    const h = Math.floor(totalDuration / 3600);
    const m = Math.floor((totalDuration % 3600) / 60);
    const s = Math.floor(totalDuration % 60);
    
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const formatCreatedAt = (createdAt) => {
    if (!createdAt) return "";
    
    const date = new Date(createdAt);
    if (isNaN(date.getTime())) return "";

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = date.getDate();
    const month = months[date.getMonth()];
    
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // convert 0 to 12

    return `${day} ${month}, ${hours}.${minutes} ${ampm}`;
};
