import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { getAuth, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';

const UserProfile = () => {
    const { user } = useAuth();

    const validationSchema = Yup.object({
        currentPassword: Yup.string().required('A senha atual é obrigatória'),
        newPassword: Yup.string().min(6, 'A nova senha deve ter no mínimo 6 caracteres').required('Obrigatório'),
        confirmPassword: Yup.string()
            .oneOf([Yup.ref('newPassword'), null], 'As senhas não correspondem')
            .required('Obrigatório'),
    });

    const handleSubmit = async (values, { setSubmitting, resetForm, setFieldError }) => {
        if (!user || !user.email) {
            alert("Usuário não encontrado.");
            setSubmitting(false);
            return;
        }

        try {
            // 1. Reautenticar o usuário com a senha atual por segurança
            const credential = EmailAuthProvider.credential(user.email, values.currentPassword);
            await reauthenticateWithCredential(user, credential);

            // 2. Se a reautenticação for bem-sucedida, atualizar para a nova senha
            await updatePassword(user, values.newPassword);

            alert('Senha atualizada com sucesso!');
            resetForm();

        } catch (error) {
            console.error("Erro ao atualizar senha:", error);
            if (error.code === 'auth/wrong-password') {
                setFieldError('currentPassword', 'A senha atual está incorreta.');
            } else {
                alert('Ocorreu um erro ao atualizar a senha.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="text-white max-w-lg mx-auto">
            <h1 className="text-3xl font-bold">Meu Perfil</h1>
            <p className="text-gray-400 mt-2">Altere sua senha de acesso para manter sua conta segura.</p>

            <div className="mt-8">
                <Formik
                    initialValues={{ currentPassword: '', newPassword: '', confirmPassword: '' }}
                    validationSchema={validationSchema}
                    onSubmit={handleSubmit}
                >
                    {({ isSubmitting }) => (
                        <Form className="bg-gray-800 p-6 rounded-lg space-y-4">
                            <div>
                                <label htmlFor="currentPassword">Senha Atual</label>
                                <Field name="currentPassword" type="password" className="w-full bg-gray-700 rounded p-2 mt-1" />
                                <ErrorMessage name="currentPassword" component="div" className="text-red-400 text-xs mt-1" />
                            </div>
                            <div>
                                <label htmlFor="newPassword">Nova Senha</label>
                                <Field name="newPassword" type="password" className="w-full bg-gray-700 rounded p-2 mt-1" />
                                <ErrorMessage name="newPassword" component="div" className="text-red-400 text-xs mt-1" />
                            </div>
                            <div>
                                <label htmlFor="confirmPassword">Confirmar Nova Senha</label>
                                <Field name="confirmPassword" type="password" className="w-full bg-gray-700 rounded p-2 mt-1" />
                                <ErrorMessage name="confirmPassword" component="div" className="text-red-400 text-xs mt-1" />
                            </div>
                            <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition-colors">
                                {isSubmitting ? 'Atualizando...' : 'Atualizar Senha'}
                            </button>
                        </Form>
                    )}
                </Formik>
            </div>
        </div>
    );
};

export default UserProfile;
