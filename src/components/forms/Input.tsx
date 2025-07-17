import { useField } from 'formik';

interface InputProps {
  id: string;
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
}

const Input = ({ label, ...props }: InputProps) => {
  const [field, meta] = useField(props);
  return (
    <div>
      <label htmlFor={props.id || props.name} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        className={`block w-full px-3 py-2 mt-1 text-gray-900 placeholder-gray-500 border rounded-md shadow-sm appearance-none focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${
          meta.touched && meta.error ? 'border-red-500' : 'border-gray-300'
        }`}
        {...field}
        {...props}
      />
      {meta.touched && meta.error ? (
        <div className="mt-1 text-xs text-red-500">{meta.error}</div>
      ) : null}
    </div>
  );
};

export default Input;
