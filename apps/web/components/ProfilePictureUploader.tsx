import React, { useState } from "react";
import ProfilePicture from "./ProfilePicture";
import styles from "../styles/ProfilePictureUploader.module.scss";
import hash from "object-hash";
import { useDispatch, useSelector } from "react-redux";
import { selectUserState, setUserState } from "../store/UserSlice";

async function handleFileUpload(
  userId: string,
  file: File | null
): Promise<boolean> {
  if (!file) return false;
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`/api/users/${userId}/update-profile-picture`, {
    method: "PUT",
    credentials: "same-origin",
    body: formData,
  });
  return response.ok ? true : false;
}

const ProfilePictureUploader = (props: {
  userId: string;
  width: number;
  height: number;
  setFileHash: (hash: string) => void;
  fileHash: string | null;
}): JSX.Element => {
  const hiddenFileInput = React.useRef<HTMLInputElement>(null);
  const [errorMessage, _setErrorMessage] = useState<string>("");
  const UserState = useSelector(selectUserState);
  const dispatch = useDispatch();

  const setErrorMessage = (msg: string): void => {
    _setErrorMessage(msg);
    setTimeout(() => {
      _setErrorMessage("");
    }, 2500);
  };

  async function handleChange(
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    const uploadedFile = event.target.files ? event.target.files[0] : null;
    if (!uploadedFile) {
      return setErrorMessage("No file provided");
    }
    if (uploadedFile?.type != "image/jpeg") {
      return setErrorMessage("Wrong extension, please use jpeg");
    }
    if (uploadedFile.size > 5000000) {
      return setErrorMessage("File size exceeds 5MB");
    }
    if ((await handleFileUpload(props.userId, uploadedFile)) === true) {
      const avatarHash = hash(uploadedFile);
      dispatch(setUserState({ ...UserState, avatarHash: avatarHash}));
      props.setFileHash(avatarHash);
    } else {
      return setErrorMessage("Unexpected error, please try again");
    }
  }

  return (
    <>
      <div className={styles.profilePictureUploader}>
        <ProfilePicture
          userId={props.userId}
          width={props.width}
          height={props.height}
          fileHash={props.fileHash}
          handleClick={undefined}
        />

        {errorMessage && (
          <div className={styles.errorMessage}>{errorMessage}</div>
        )}

        <div
          className={styles.hoverMessage}
          onClick={(): void => hiddenFileInput.current?.click()}
        >
          Change
        </div>

        <input
          type="file"
          ref={hiddenFileInput}
          onChange={handleChange}
          style={{ display: "none" }}
        />
      </div>
    </>
  );
};
export default ProfilePictureUploader;
