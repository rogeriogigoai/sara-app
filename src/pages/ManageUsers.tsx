import { useState, useEffect, useCallback, useMemo } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, collection, getDocs, orderBy, query, type DocumentData } from 'firebase/firestore';

const UserForm = ({ user, onFinish, onCancel }: { user: DocumentData | {}, onFinish: Function, onCancel: Function }) => {
    const isEditing = !!user.id;
    const functions = getFunctions();

    const validationSchema = Yup.object({
        name: Yup.string().required('Obrigatório'),
        re: Yup.string().required('RE é obrigatório'), // Adicionada validação para o RE
        email: Yup.string().email('Email inválido').required('Obrigatório'),
        password: isEditing ? Yup.string().min(6, 'A nova senha deve ter no mínimo 6 caracteres') : Yup.string().min(6, 'A senha deve ter no mínimo 6 caracteres').required('Obrigatório'),
        permission: Yup.number().min(1).max(5).required('Obrigatório'),
        status: Yup.string().required('Obrigatório'),
    });

    const handleSubmit = async (values, { setSubmitting }) => {
        try {
            const manageUser = httpsCallable(functions, 'manageUser');
            await manageUser({ uid: user.id, ...values });
            alert(`Usuário ${isEditing ? 'atualizado' : 'criado'} com sucesso!`);
            onFinish();
        } catch (error) {
            console.error("Erro ao salvar usuário:", error);
            alert(`Falha ao salvar usuário: ${error.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div>
            <h2 className="text-2xl font-semibold mb-4">{isEditing ? `Editando: ${user.name}` : 'Criar Novo Usuário'}</h2>
            <Formik
                initialValues={{ name: user.name || '', re: user.re || '', email: user.email || '', password: '', permission: user.permission || 1, status: user.status || 'Ativo' }}
                validationSchema={validationSchema}
                onSubmit={handleSubmit}
            >
                {({ isSubmitting }) => (
                    <Form className="bg-gray-800 p-6 rounded-lg space-y-4">
                        <div><label htmlFor="name">Nome</label><Field name="name" type="text" className="w-full bg-gray-700 rounded p-2 mt-1" /><ErrorMessage name="name" component="div" className="text-red-400 text-xs mt-1" /></div>
                        <div><label htmlFor="re">RE (Registro do Empregado)</label><Field name="re" type="text" className="w-full bg-gray-700 rounded p-2 mt-1" /><ErrorMessage name="re" component="div" className="text-red-400 text-xs mt-1" /></div>
                        <div><label htmlFor="email">Email</label><Field name="email" type="email" className="w-full bg-gray-700 rounded p-2 mt-1" /><ErrorMessage name="email" component="div" className="text-red-400 text-xs mt-1" /></div>
                        <div><label htmlFor="password">Senha {isEditing && '(Deixe em branco para não alterar)'}</label><Field name="password" type="password" className="w-full bg-gray-700 rounded p-2 mt-1" /><ErrorMessage name="password" component="div" className="text-red-400 text-xs mt-1" /></div>
                        <div><label htmlFor="permission">Nível de Permissão (1-5)</label><Field name="permission" type="number" min="1" max="5" className="w-full bg-gray-700 rounded p-2 mt-1" /><ErrorMessage name="permission" component="div" className="text-red-400 text-xs mt-1" /></div>
                        <div><label htmlFor="status">Status</label><Field as="select" name="status" className="w-full bg-gray-700 rounded p-2 mt-1"><option value="Ativo">Ativo</option><option value="Inativo">Inativo</option></Field><ErrorMessage name="status" component="div" className="text-red-400 text-xs mt-1" /></div>
                        <div className="flex gap-4">
                            <button type="button" onClick={() => onCancel()} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">Cancelar</button>
                            <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">{isSubmitting ? 'Salvando...' : 'Salvar'}</button>
                        </div>
                    </Form>
                )}
            </Formik>
        </div>
    );
};

const ManageUsers = () => {
    const [allUsers, setAllUsers] = useState<DocumentData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<DocumentData | null | {}>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const db = getFirestore();

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
            const userSnapshot = await getDocs(q);
            const userList = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllUsers(userList);
        } catch (error) {
            console.error("Erro ao buscar usuários:", error);
        } finally {
            setLoading(false);
        }
    }, [db]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const filteredUsers = useMemo(() => {
        if (!searchTerm) {
            return allUsers;
        }
        return allUsers.filter(user =>
            user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.re?.toLowerCase().includes(searchTerm.toLowerCase()) // Adicionado filtro por RE
        );
    }, [searchTerm, allUsers]);

    if (selectedUser) {
        return <UserForm user={selectedUser} onFinish={() => { setSelectedUser(null); fetchUsers(); }} onCancel={() => setSelectedUser(null)} />;
    }

    return (
        <div className="text-white">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                <h1 className="text-3xl font-bold">Gerenciar Usuários</h1>
                <button onClick={() => setSelectedUser({})} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Incluir Usuário Novo</button>
            </div>
            <div className="my-4">
                <input
                    type="text"
                    placeholder="Filtrar por nome, email ou RE..."
                    className="w-full bg-gray-700 border border-gray-600 rounded-md p-3 text-white focus:ring-2 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="mt-8 bg-gray-800 rounded-lg">
                <ul className="divide-y divide-gray-700">
                    {loading ? <li className="p-4 text-center">Carregando usuários...</li> : filteredUsers.map(user => (
                        <li key={user.id} onClick={() => setSelectedUser(user)} className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-700/50">
                            <div>
                                <p className="font-semibold">{user.name || user.email}</p>
                                <p className="text-sm text-gray-400">RE: {user.re || 'N/A'} | Permissão Nível {user.permission}</p>
                            </div>
                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${user.status === 'Ativo' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-300'}`}>{user.status}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default ManageUsers;
