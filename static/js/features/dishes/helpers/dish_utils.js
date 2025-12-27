

function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function isYesterday(date) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date, yesterday);
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date) {
  return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export function recipePreparedDateInfo(createdDate,createdTime, isButtonPressed){
  // Combine into one string in ISO format
  const [year, month, day] = createdDate.split("-").map(Number);
  const [hour, minute, second] = createdTime.split(":").map(Number);

  const createdAt = new Date(year, month - 1, day, hour, minute, second); //console.log("createdAt : ", createdAt);
  const now = new Date();

  const diffInMillis = now - createdAt;           // difference in milliseconds
  const diffInMinutes = diffInMillis / (1000 * 60);
  const diffInHours = diffInMillis / (1000 * 60 * 60);

  let displayText = "";
  if (diffInMinutes < 60) {
    if (isButtonPressed){
      displayText = `Record created now at ${formatTime(createdAt)}`;
    }else{
      displayText = `Prepared Recently At ${formatTime(createdAt)}`;
    }
  } 
  else if (isSameDay(createdAt, now)) {
    if (isButtonPressed){
      displayText = `Record created for today at ${formatTime(createdAt)}`;
    }else{
      displayText = `Prepared Today At ${formatTime(createdAt)}`;
    } 
  } 
  else if (isYesterday(createdAt)) {
    if(isButtonPressed){
      displayText = `Record created for yesterday at ${formatTime(createdAt)}`;
    }else{
      displayText = `Prepared Yesterday At ${formatTime(createdAt)}`;
    }
  } 
  else {
    if(isButtonPressed){
      displayText = `Record created for ${formatDate(createdAt)}`;
    }
      displayText = `Prepared On ${formatDate(createdAt)}`;
  }

  return displayText;
}
