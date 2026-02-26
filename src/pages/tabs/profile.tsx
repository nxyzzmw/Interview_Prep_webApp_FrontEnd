type ProfileProps = {
  role: string;
  token: string;
  name: string;
  email: string;
};

const Profile = ({ role, token, name, email }: ProfileProps) => {
  return (
    <section className="panel-card">
      <h2>Profile</h2>
      <p>Name: {name || 'User'}</p>
      <p>Email: {email || 'N/A'}</p>
      <p>Role: {role}</p>
      <p className="token-preview">Access Token: {`${token.slice(0, 12)}...`}</p>
    </section>
  );
};

export default Profile;
