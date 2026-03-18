import { Link } from 'react-router-dom';
import styles from './LandingPage.module.css';

export default function LandingPage() {
  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Todo List</h1>
        <p className={styles.subtitle}>
          Stay organized. Get things done. A simple, beautiful todo app.
        </p>
        <div className={styles.buttons}>
          <Link to="/register" className={styles.primaryBtn}>Get Started</Link>
          <Link to="/login" className={styles.secondaryBtn}>Sign In</Link>
        </div>
      </div>
    </div>
  );
}
