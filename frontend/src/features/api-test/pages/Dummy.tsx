import { useState } from 'react';
import {axiosInstance} from '@/shared/lib/axiosInstance';

const Dummy = () => {
    const [method, setMethod] = useState('GET');
    const [url, setUrl] = useState('');
    const [body, setBody] = useState('');
    const [response, setResponse] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await axiosInstance({
                method,
                url,
                data: method !== 'GET' ? body : undefined,
            });
            setResponse(JSON.stringify(res.data, null, 2));
        } catch (error) {
            setResponse(`Error: ${error}`);
        }
    };

    return (
        <div className="flex flex-col justify-center p-0 align-center bg-cover lg:flex-row lg:p-8">
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md">
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="method">
                        Method
                    </label>
                    <select
                        id="method"
                        value={method}
                        onChange={(e) => setMethod(e.target.value)}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                    </select>
                </div>
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="url">
                        URL
                    </label>
                    <input
                        type="text"
                        id="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    />
                </div>
                {method !== 'GET' && (
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="body">
                            Body
                        </label>
                        <textarea
                            id="body"
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        />
                    </div>
                )}
                <button
                    type="submit"
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                    Send Request
                </button>
            </form>
            {response && (
                <div className="mt-6 bg-gray-100 p-4 rounded shadow-md">
                    <h3 className="text-lg font-bold mb-2">Response:</h3>
                    <pre>{response}</pre>
                </div>
            )}
        </div>
    );
}

export default Dummy;