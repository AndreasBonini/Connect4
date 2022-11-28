
export default function Notice(props)
{
  return (
    <div className={`notice ${props.colorType ?? ""}`}>
      <p>{props.text}</p>
    </div>
  )
}